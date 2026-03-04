const Queue = require('bull');
const { v7: uuidv7 } = require('uuid');
const database = require('../config/database');
const omrService = require('../services/omr.service');
const axios = require('axios');
const templateConfig = require('../config/omr-template');

/**
 * ===== BULL QUEUE SETUP =====
 * Xử lý OMR bất đồng bộ để không block API
 */

// Parse Redis URL for Bull (Bull dùng ioredis, cần config object)
const redisUrl = new URL(process.env.REDIS_URL);

const omrQueue = new Queue('omr-processing', {
  redis: {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port) || 6379,
    password: redisUrl.password,
    tls: redisUrl.protocol === 'rediss:' ? {
      rejectUnauthorized: true
    } : undefined
    // ⚠️ KHÔNG dùng enableReadyCheck, maxRetriesPerRequest 
    // Bull sẽ tự động handle (see: https://github.com/OptimalBits/bull/issues/1873)
  },
  defaultJobOptions: {
    attempts: 3, // Retry 3 lần nếu thất bại
    backoff: {
      type: 'exponential',
      delay: 5000 // Retry sau 5s, 10s, 20s
    },
    removeOnComplete: 100, // Giữ lại 100 job thành công gần nhất
    removeOnFail: 500 // Giữ lại 500 job thất bại gần nhất
  }
});

// Event handlers để monitor queue
omrQueue.on('error', (error) => {
  console.error('❌ Queue Error:', error.message);
});

omrQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} đang chờ xử lý...`);
});

omrQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} đang được xử lý...`);
});

omrQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} hoàn thành:`, result);
});

omrQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} thất bại:`, err.message);
});

/**
 * Add job vào queue để xử lý OMR
 * @param {number} submission_id - ID của submission cần xử lý
 */
async function addOMRJob(submission_id) {
  try {
    const job = await omrQueue.add('process-answer-sheet', {
      submission_id,
      timestamp: new Date().toISOString()
    }, {
      jobId: `omr-${submission_id}`, // Unique job ID để tránh duplicate
      priority: 1 // Priority cao hơn = xử lý trước
    });

    console.log(`✅ Added OMR job: ${job.id} for submission ${submission_id}`);
    return job;
  } catch (error) {
    console.error(`❌ Failed to add OMR job for submission ${submission_id}:`, error);
    throw error;
  }
}

/**
 * Process job - Xử lý OMR thực sự
 */
omrQueue.process('process-answer-sheet', async (job) => {
  const { submission_id } = job.data;
  const startTime = Date.now();

  try {
    console.log(`🔄 Processing OMR for submission ${submission_id}...`);

    // Update status sang 'processing'
    await database.query(
      'UPDATE submissions SET processing_status = ? WHERE id = ?',
      ['processing', submission_id]
    );

    // Log bắt đầu xử lý (TEMP: Disabled vì schema issue)
    // await database.query(
    //   `INSERT INTO omr_processing_logs (id, submission_id, step, status, created_at) 
    //    VALUES (?, ?, 'started', 'started', NOW())`,
    //   [uuidv7(), submission_id]
    // );

    // Lấy thông tin submission
    const [submissions] = await database.query(
      `SELECT s.*, eb.quiz_id, eb.access_code as exam_code
       FROM submissions s
       JOIN exam_batches eb ON s.batch_id = eb.id
       WHERE s.id = ?`,
      [submission_id]
    );

    if (!submissions || submissions.length === 0) {
      throw new Error('Submission not found');
    }
    
    const submission = submissions[0];

    // Lấy answer key
    const [answerKeys] = await database.query(
      'SELECT correct_answers FROM answer_keys WHERE quiz_id = ? ORDER BY created_at DESC LIMIT 1',
      [submission.quiz_id]
    );

    if (!answerKeys || answerKeys.length === 0) {
      throw new Error('Answer key not found');
    }
    
    const answerKey = answerKeys[0];

    // Download ảnh từ Cloudinary (public URL)
    console.log(`📥 Downloading image: ${submission.original_image_url}`);
    
    const imageResponse = await axios.get(submission.original_image_url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0' // Some CDN require user agent
      }
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Update job progress
    job.progress(20);

    // ===== XỬ LÝ OMR =====
    const omrResult = await omrService.processAnswerSheet(
      imageBuffer,
      templateConfig
    );
    
    if (!omrResult.success) {
      throw new Error(omrResult.error || 'OMR processing failed');
    }

    job.progress(60);

    // Parse answer key (nếu là string thì parse, nếu đã là object thì dùng luôn)
    const correctAnswers = typeof answerKey.correct_answers === 'string' 
      ? JSON.parse(answerKey.correct_answers) 
      : answerKey.correct_answers;
    
    // Parse question points (nếu có trong answer_keys)
    let questionPoints = {};
    if (answerKey.question_points) {
      questionPoints = typeof answerKey.question_points === 'string'
        ? JSON.parse(answerKey.question_points)
        : answerKey.question_points;
    }
    
    // Nếu không có question_points, query từ questions table
    if (Object.keys(questionPoints).length === 0) {
      const [questions] = await database.query(
        `SELECT id, point, correct_answer 
         FROM questions 
         WHERE quiz_id = ? AND is_deleted = FALSE
         ORDER BY id`,
        [submission.quiz_id]
      );
      
      // Map theo thứ tự (giả sử questions được order theo id)
      questions.forEach((q, index) => {
        questionPoints[index + 1] = q.point;
      });
    }
    
    // Tính tổng điểm tối đa
    const totalPossibleScore = Object.values(questionPoints).reduce((sum, point) => sum + point, 0);
    
    // ===== CHẤM ĐIỂM =====
    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;
    let totalScore = 0; // Điểm thực tế đạt được
    const details = [];
    
    for (let i = 1; i <= templateConfig.total_questions; i++) {
      const detected = omrResult.detectedAnswers[i];
      const correct = correctAnswers[i] || null;
      const point = questionPoints[i] || 0;
      
      // Bỏ qua câu không có trong quiz (not mapped)
      if (!correct || point === 0) {
        continue;
      }
      
      let isCorrect = false;
      if (!detected) {
        emptyCount++;
      } else if (detected === correct) {
        correctCount++;
        isCorrect = true;
        totalScore += point; // Cộng điểm của câu đúng
      } else {
        wrongCount++;
      }
      
      details.push({
        question_number: i,
        detected_answer: detected || null,
        correct_answer: correct,
        is_correct: isCorrect,
        point_earned: isCorrect ? point : 0
      });
    }
    
    // Round điểm đến 2 chữ số thập phân
    totalScore = Math.round(totalScore * 100) / 100;

    // ===== IDENTIFY STUDENT (từ số báo danh đã đọc) =====
    let student_id = submission.student_id; // Có thể null
    
    if (!student_id && omrResult.studentCode) {
      // Tìm student từ student_code đã đọc được
      const [students] = await database.query(
        'SELECT id FROM students WHERE student_code = ?',
        [omrResult.studentCode]
      );
      
      if (students && students.length > 0) {
        student_id = students[0].id;
        console.log(`✅ Identified student: ${omrResult.studentCode} → ${student_id}`);
        
        // Check duplicate: Xóa submission cũ của student này trong batch (nếu có)
        const [existingSubmissions] = await database.query(
          `SELECT id FROM submissions 
           WHERE batch_id = (SELECT batch_id FROM submissions WHERE id = ?)
           AND student_id = ?
           AND id != ?`,
          [submission_id, student_id, submission_id]
        );
        
        if (existingSubmissions && existingSubmissions.length > 0) {
          const oldId = existingSubmissions[0].id;
          console.log(`⚠️ Found duplicate submission ${oldId}, deleting old one...`);
          
          // Delete old submission details first
          await database.query(
            'DELETE FROM submission_details WHERE submission_id = ?',
            [oldId]
          );
          
          // Delete old submission
          await database.query(
            'DELETE FROM submissions WHERE id = ?',
            [oldId]
          );
          
          console.log(`✅ Deleted old submission ${oldId}`);
        }
      } else {
        console.warn(`⚠️ Student not found for code: ${omrResult.studentCode}`);
        omrResult.needsReview = true;
      }
    }

    job.progress(80);

    // Tính % điểm
    const scorePercentage = totalPossibleScore > 0 
      ? Math.round((totalScore / totalPossibleScore) * 100 * 100) / 100 
      : 0;

    // ===== CẬP NHẬT KẾT QUẢ =====
    await database.query(
      `UPDATE submissions 
       SET student_id = ?,
           student_code = ?,
           processing_status = ?,
           qr_detected = ?,
           qr_data = ?,
           detected_answers = ?,
           total_score = ?,
           correct_count = ?,
           wrong_count = ?,
           empty_count = ?,
           accuracy_score = ?,
           needs_review = ?,
           processing_time_ms = ?,
           processed_at = NOW()
       WHERE id = ?`,
      [
        student_id,
        omrResult.studentCode || null,
        omrResult.needsReview ? 'manual_review' : 'completed',
        omrResult.qrDetected ? 1 : 0,
        omrResult.qrData ? JSON.stringify(omrResult.qrData) : null,
        JSON.stringify(omrResult.detectedAnswers),
        totalScore,
        correctCount,
        wrongCount,
        emptyCount,
        omrResult.accuracyScore,
        omrResult.needsReview ? 1 : 0,
        Date.now() - startTime,
        submission_id
      ]
    );

    // Lưu chi tiết từng câu
    if (details && details.length > 0) {
      // Xóa details cũ nếu có (trong trường hợp retry)
      await database.query(
        'DELETE FROM submission_details WHERE submission_id = ?',
        [submission_id]
      );
      
      for (const detail of details) {
        await database.query(
          `INSERT INTO submission_details 
           (id, submission_id, question_number, detected_answer, correct_answer, is_correct, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            uuidv7(),
            submission_id,
            detail.question_number,
            detail.detected_answer,
            detail.correct_answer,
            detail.is_correct ? 1 : 0
          ]
        );
      }
    }

    // Update processed_submissions count
    await database.query(
      'UPDATE exam_batches SET processed_submissions = processed_submissions + 1 WHERE id = ?',
      [submission.batch_id]
    );

    // Log thành công (TEMP: Disabled vì schema issue)
    // await database.query(
    //   `INSERT INTO omr_processing_logs 
    //    (id, submission_id, step, status, details, processing_time_ms, created_at) 
    //    VALUES (?, ?, 'completed', 'completed', ?, ?, NOW())`,
    //   [
    //     uuidv7(),
    //     submission_id,
    //     JSON.stringify({ total_score: totalScore, accuracy: omrResult.accuracyScore }),
    //     Date.now() - startTime
    //   ]
    // );

    job.progress(100);

    const finalResult = {
      success: true,
      total_score: totalScore,
      total_possible_score: totalPossibleScore,
      score_percentage: scorePercentage,
      correct_count: correctCount,
      wrong_count: wrongCount,
      empty_count: emptyCount,
      accuracy_score: omrResult.accuracyScore,
      student_code: omrResult.studentCode,
      needs_review: omrResult.needsReview
    };

    console.log(`✅ Completed OMR for submission ${submission_id} in ${Date.now() - startTime}ms`);
    return finalResult;

  } catch (error) {
    console.error(`❌ OMR processing failed for submission ${submission_id}:`, error);

    // Update status sang 'failed'
    await database.query(
      `UPDATE submissions 
       SET processing_status = 'failed', 
           error_message = ?,
           processing_time_ms = ?
       WHERE id = ?`,
      [error.message, Date.now() - startTime, submission_id]
    );

    // Log lỗi (TEMP: Disabled vì schema issue)
    // await database.query(
    //   `INSERT INTO omr_processing_logs 
    //    (id, submission_id, step, status, error_message, processing_time_ms, created_at) 
    //    VALUES (?, ?, 'failed', 'failed', ?, ?, NOW())`,
    //   [uuidv7(), submission_id, error.message, Date.now() - startTime]
    // );

    throw error; // Để Bull retry
  }
});

/**
 * Event listeners
 */
omrQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed with result:`, result.total_score);
});

omrQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed with error:`, err.message);
});

omrQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing OMR queue...');
  await omrQueue.close();
  process.exit(0);
});

module.exports = {
  omrQueue,
  addOMRJob
};
