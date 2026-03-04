const db = require('../models');
const database = require('../config/database');
const { v7: uuidv7 } = require('uuid');
const Quiz = require('../models/Quiz');
const Classroom = require('../models/Classroom');
const omrService = require('../services/omr.service');
const omrAnswerMapper = require('../services/omrAnswerMapper.service');
const templateService = require('../services/template.service');
const cloudinary = require('../config/cloudinary');
const { addOMRJob } = require('../queues/omr.queue');
const { generateThreeDigitCode } = require('../utils/code_generator');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

/**
 * ===== EXAM BATCH CONTROLLERS =====
 * Quản lý các đợt thi/kiểm tra
 */

// Tạo đợt thi mới từ quiz
exports.createExamBatch = async (req, res) => {
  try {
    const { quiz_id, classroom_id, name, description, batch_type, start_at, end_at, access_code, time_limit_minutes } = req.body;
    const userId = req.user.id;

    // Validate quiz tồn tại
    const quiz = await Quiz.findById(quiz_id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz không tồn tại' });
    }

    // Validate classroom tồn tại và user có quyền
    const classroom = await Classroom.findById(classroom_id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom không tồn tại' });
    }

    // Check user là giáo viên của classroom này
    if (classroom.teacher_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo đợt thi cho classroom này' });
    }

    // Lấy template mặc định
    const [template] = await database.query(
      'SELECT id FROM answer_templates WHERE is_active = 1 LIMIT 1'
    );

    if (!template || template.length === 0) {
      return res.status(500).json({ success: false, message: 'Không tìm thấy template phiếu trả lời' });
    }

    // Tạo answer key từ quiz
    const answerKey = await omrAnswerMapper.createAnswerKeyFromQuiz(quiz_id);
    
    // Insert answer key vào DB với UUID
    const answerKeyId = uuidv7();
    await database.query(
      `INSERT INTO answer_keys (id, quiz_id, correct_answers, score_per_question, default_score_per_question, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        answerKeyId, quiz_id,
        JSON.stringify(answerKey.correct_answers),
        answerKey.score_per_question ? JSON.stringify(answerKey.score_per_question) : null,
        answerKey.default_score_per_question,
        userId
      ]
    );

    // Tạo exam batch với UUID
    // Nếu không truyền access_code (mã đề), tự động sinh 3 số ngẫu nhiên (VD: 234)
    const examCode = access_code || generateThreeDigitCode();
    const batchId = uuidv7();
    await database.query(
      `INSERT INTO exam_batches 
       (id, quiz_id, classroom_id, template_id, name, description, batch_type, start_at, end_at, 
        access_code, time_limit_minutes, total_score, created_by, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batchId, quiz_id, classroom_id, template[0].id, name, description || null, batch_type || 'exam',
        start_at || null, end_at || null, examCode, time_limit_minutes || null,
        answerKey.total_score, userId, 'scheduled'
      ]
    );

    // Lấy thông tin batch vừa tạo
    const [newBatch] = await database.query(
      'SELECT * FROM exam_batches WHERE id = ?',
      [batchId]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo đợt thi thành công',
      data: {
        batch: newBatch[0],
        answer_key: {
          total_questions: answerKey.total_questions,
          mapped_questions: Object.values(answerKey.correct_answers).filter(a => a !== null).length,
          unmapped_questions: Object.values(answerKey.correct_answers).filter(a => a === null).length
        }
      }
    });

  } catch (error) {
    console.error('Create exam batch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách exam batches của một classroom
exports.getExamBatches = async (req, res) => {
  try {
    const { classroom_id } = req.params;
    const { status, batch_type } = req.query;
    const userId = req.user.id;

    // Validate classroom và quyền truy cập
    const classroom = await Classroom.findById(classroom_id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom không tồn tại' });
    }

    // Check quyền: teacher của classroom hoặc student trong classroom
    const isTeacher = classroom.teacher_id === userId;
    let isStudent = false;
    
    if (!isTeacher) {
      const [rows] = await database.query(
        `SELECT * FROM classroom_students 
         WHERE classroom_id = ? AND student_id = (SELECT id FROM students WHERE user_id = ?)`,
        [classroom_id, userId]
      );
      const student = rows[0];
      isStudent = !!student;
    }

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đợt thi của classroom này' });
    }

    // Build query
    let whereConditions = ['classroom_id = ?', 'is_deleted = FALSE'];
    const replacements = [classroom_id];

    if (status) {
      whereConditions.push('status = ?');
      replacements.push(status);
    }

    if (batch_type) {
      whereConditions.push('batch_type = ?');
      replacements.push(batch_type);
    }

    const [batches] = await database.query(
      `SELECT eb.*, 
              (SELECT name FROM quizzes WHERE id = eb.quiz_id) as quiz_name,
              (SELECT COUNT(*) FROM submissions WHERE batch_id = eb.id) as submission_count
       FROM exam_batches eb
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY eb.created_at DESC`,
      replacements
    );

    res.json({ success: true, data: batches });

  } catch (error) {
    console.error('Get exam batches error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết một exam batch
exports.getExamBatchDetail = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const userId = req.user.id;

    // Lấy thông tin batch
    const [rows] = await database.query(
      `SELECT eb.*, 
              (SELECT name FROM quizzes WHERE id = eb.quiz_id) as quiz_name,
              (SELECT name FROM classrooms WHERE id = eb.classroom_id) as classroom_name
       FROM exam_batches eb
       WHERE eb.id = ? AND eb.is_deleted = FALSE`,
      [batch_id]
    );
    const batch = rows[0];

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    // Check quyền truy cập
    const classroom = await Classroom.findById(batch.classroom_id);
    const isTeacher = classroom.teacher_id === userId;

    // Lấy answer key
    const [rows2] = await database.query(
      'SELECT * FROM answer_keys WHERE quiz_id = ? ORDER BY created_at DESC LIMIT 1',
      [batch.quiz_id]
    );
    const answerKey = rows2[0];

    // Lấy danh sách submissions (nếu là teacher)
    let submissions = [];
    if (isTeacher) {
      const [submissionRows] = await database.query(
        `SELECT s.*,
                (SELECT full_name FROM user_profiles WHERE user_id = (SELECT user_id FROM students WHERE id = s.student_id)) as student_name
         FROM submissions s
         WHERE s.batch_id = ?
         ORDER BY s.submitted_at DESC`,
        [batch_id]
      );
      submissions = submissionRows;
    }

    res.json({
      success: true,
      data: {
        batch,
        answer_key: answerKey ? {
          correct_answers: JSON.parse(answerKey.correct_answers),
          default_score_per_question: answerKey.default_score_per_question
        } : null,
        submissions: isTeacher ? submissions : []
      }
    });

  } catch (error) {
    console.error('Get exam batch detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Preview answer key trước khi tạo batch
exports.previewAnswerKey = async (req, res) => {
  try {
    const { quiz_id } = req.params;

    const preview = await omrAnswerMapper.previewAnswerKey(quiz_id);
    
    res.json({
      success: true,
      data: preview
    });

  } catch (error) {
    console.error('Preview answer key error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật trạng thái exam batch
exports.updateExamBatchStatus = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate batch tồn tại
    const [rows] = await database.query(
      'SELECT * FROM exam_batches WHERE id = ? AND is_deleted = FALSE',
      [batch_id]
    );
    const batch = rows[0];

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    // Check quyền
    const classroom = await Classroom.findById(batch.classroom_id);
    if (classroom.teacher_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật batch này' });
    }

    // Update status
    await database.query(
      'UPDATE exam_batches SET status = ? WHERE id = ?',
      [status, batch_id]
    );

    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });

  } catch (error) {
    console.error('Update exam batch status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ===== SUBMISSION CONTROLLERS =====
 * Xử lý bài làm của sinh viên
 */

// Upload và xử lý ảnh phiếu trả lời
exports.submitAnswerSheet = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const userId = req.user.id;

    // Validate file upload
    if (!req.files || !req.files.answer_sheet) {
      return res.status(400).json({ success: false, message: 'Vui lòng upload ảnh phiếu trả lời' });
    }

    const file = req.files.answer_sheet;

    // Validate file type - CHỈ CHO PHÉP ẢNH
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ chấp nhận file ảnh (JPG, PNG). Vui lòng chụp/scan phiếu trả lời thành ảnh.' 
      });
    }

    // Lấy thông tin batch
    const [rows] = await database.query(
      'SELECT * FROM exam_batches WHERE id = ? AND is_deleted = FALSE',
      [batch_id]
    );
    const batch = rows[0];

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    // Check batch status
    if (batch.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Đợt thi này đã đóng hoặc chưa mở' });
    }

    // Upload ảnh phiếu trả lời lên Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'omr/submissions',
      resource_type: 'image',
      transformation: [{ quality: 'auto:good' }] // Tối ưu chất lượng cho OMR
    });

    // Tạo submission với student_id = NULL (sẽ được OMR identify sau)
    const submissionId = uuidv7();
    await database.query(
      `INSERT INTO submissions 
       (id, batch_id, student_id, original_image_url, processing_status, submitted_at) 
       VALUES (?, ?, NULL, ?, 'pending', NOW())`,
      [submissionId, batch_id, uploadResult.secure_url]
    );

    // Cập nhật total_submissions
    await database.query(
      'UPDATE exam_batches SET total_submissions = total_submissions + 1 WHERE id = ?',
      [batch_id]
    );

    // Trigger OMR processing với Bull queue
    const job = await addOMRJob(submissionId);
    
    // Đợi job hoàn thành (max 10 giây)
    try {
      await job.finished();
      
      // Lấy kết quả từ database
      const [submissions] = await database.query(
        `SELECT id, student_id, student_code, processing_status, 
                total_score, correct_count, wrong_count, empty_count, 
                accuracy_score, needs_review, processing_time_ms
         FROM submissions 
         WHERE id = ?`,
        [submissionId]
      );
      
      const result = submissions[0];
      
      // Lấy thêm thông tin quiz để tính total_possible_score
      const [quizzes] = await database.query(
        `SELECT (SELECT SUM(point) FROM questions WHERE quiz_id = eb.quiz_id AND is_deleted = FALSE) as total_possible_score
         FROM exam_batches eb
         JOIN submissions s ON s.batch_id = eb.id
         WHERE s.id = ?`,
        [submissionId]
      );
      
      const totalPossibleScore = quizzes[0]?.total_possible_score || 10;
      const scorePercentage = totalPossibleScore > 0 
        ? Math.round((result.total_score / totalPossibleScore) * 100 * 100) / 100
        : 0;
      
      // Lấy chi tiết từng câu
      const [details] = await database.query(
        `SELECT question_number, detected_answer, correct_answer, is_correct
         FROM submission_details
         WHERE submission_id = ?
         ORDER BY question_number`,
        [submissionId]
      );
      
      res.status(201).json({
        success: true,
        message: 'Xử lý phiếu trả lời thành công',
        data: {
          submission_id: result.id,
          student_code: result.student_code,
          processing_status: result.processing_status,
          total_score: result.total_score,
          total_possible_score: totalPossibleScore,
          score_percentage: scorePercentage,
          correct_count: result.correct_count,
          wrong_count: result.wrong_count,
          empty_count: result.empty_count,
          omr_confidence: result.accuracy_score, // Đổi tên cho rõ ràng
          needs_review: result.needs_review,
          processing_time_ms: result.processing_time_ms,
          answers: details.map(d => ({
            question: d.question_number,
            your_answer: d.detected_answer,
            correct_answer: d.correct_answer,
            is_correct: d.is_correct === 1
          }))
        }
      });
      
    } catch (jobError) {
      // Nếu job timeout hoặc failed
      console.error('OMR job error:', jobError);
      
      res.status(202).json({
        success: true,
        message: 'Upload thành công. Hệ thống đang xử lý phiếu trả lời...',
        data: { 
          submission_id: submissionId,
          status: 'processing',
          note: 'Gọi GET /api/v1/omr/submissions/{id} để lấy kết quả'
        }
      });
    }

  } catch (error) {
    console.error('Submit answer sheet error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy kết quả submission
exports.getSubmissionResult = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const userId = req.user.id;

    // Lấy submission
    const [rows] = await database.query(
      `SELECT s.*,
              (SELECT full_name FROM user_profiles WHERE user_id = (SELECT user_id FROM students WHERE id = s.student_id)) as student_name,
              eb.name as batch_name,
              eb.total_score as max_score
       FROM submissions s
       JOIN exam_batches eb ON s.batch_id = eb.id
       WHERE s.id = ?`,
      [submission_id]
    );
    const submission = rows[0];

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission không tồn tại' });
    }

    // Check quyền: chỉ student của submission hoặc teacher của classroom
    const [students] = await database.query(
      'SELECT * FROM students WHERE id = ?',
      [submission.student_id]
    );
    
    const student = students[0];

    const [batchRows] = await database.query(
      'SELECT classroom_id FROM exam_batches WHERE id = ?',
      [submission.batch_id]
    );
    const batch = batchRows[0];

    const classroom = await Classroom.findById(batch.classroom_id);
    const isTeacher = classroom.teacher_id === userId;
    const isOwner = !!student;

    if (!isTeacher && !isOwner) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem kết quả này' });
    }

    // Lấy chi tiết từng câu
    const [details] = await database.query(
      `SELECT sd.*
       FROM submission_details sd
       WHERE sd.submission_id = ?
       ORDER BY sd.question_number`,
      [submission_id]
    );

    res.json({
      success: true,
      data: {
        submission: {
          ...submission,
          detected_answers: submission.detected_answers ? JSON.parse(submission.detected_answers) : null,
          qr_data: submission.qr_data ? JSON.parse(submission.qr_data) : null
        },
        details
      }
    });

  } catch (error) {
    console.error('Get submission result error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Danh sách submissions cần review
exports.getSubmissionsNeedReview = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const userId = req.user.id;

    // Validate batch và quyền
    const [rows] = await database.query(
      'SELECT classroom_id FROM exam_batches WHERE id = ? AND is_deleted = FALSE',
      [batch_id]
    );
    const batch = rows[0];

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    const classroom = await Classroom.findById(batch.classroom_id);
    if (classroom.teacher_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem' });
    }

    // Lấy danh sách cần review
    const [submissions] = await database.query(
      `SELECT s.*,
              (SELECT full_name FROM user_profiles WHERE user_id = (SELECT user_id FROM students WHERE id = s.student_id)) as student_name
       FROM submissions s
       WHERE s.batch_id = ? AND s.needs_review = TRUE
       ORDER BY s.submitted_at ASC`,
      [batch_id]
    );

    res.json({ success: true, data: submissions });

  } catch (error) {
    console.error('Get submissions need review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật kết quả sau khi review thủ công
exports.updateSubmissionAfterReview = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { detected_answers, review_notes } = req.body;
    const userId = req.user.id;

    // Validate submission
    const [rows] = await database.query(
      'SELECT * FROM submissions WHERE id = ?',
      [submission_id]
    );
    const submission = rows[0];

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission không tồn tại' });
    }

    // Check quyền: teacher của classroom
    const [batchRows] = await database.query(
      'SELECT classroom_id FROM exam_batches WHERE id = ?',
      [submission.batch_id]
    );
    const batch = batchRows[0];

    const classroom = await Classroom.findById(batch.classroom_id);
    if (classroom.teacher_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa' });
    }

    // Lấy answer key
    const [answerKeyRows] = await database.query(
      `SELECT ak.* FROM answer_keys ak
       JOIN exam_batches eb ON ak.quiz_id = eb.quiz_id
       WHERE eb.id = ?
       ORDER BY ak.created_at DESC LIMIT 1`,
      [submission.batch_id]
    );
    const answerKey = answerKeyRows[0];

    if (!answerKey) {
      return res.status(500).json({ success: false, message: 'Không tìm thấy đáp án chuẩn' });
    }

    const correctAnswers = JSON.parse(answerKey.correct_answers);

    // Tính điểm lại
    let correct_count = 0;
    let wrong_count = 0;
    let empty_count = 0;

    Object.keys(detected_answers).forEach(qNum => {
      const studentAnswer = detected_answers[qNum];
      const correctAnswer = correctAnswers[qNum];

      if (!studentAnswer) {
        empty_count++;
      } else if (studentAnswer === correctAnswer) {
        correct_count++;
      } else {
        wrong_count++;
      }
    });

    const total_score = correct_count * answerKey.default_score_per_question;

    // Update submission
    await database.query(
      `UPDATE submissions 
       SET detected_answers = ?, 
           total_score = ?,
           correct_count = ?,
           wrong_count = ?,
           empty_count = ?,
           needs_review = FALSE,
           review_notes = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           processing_status = 'completed'
       WHERE id = ?`,
      [
        JSON.stringify(detected_answers),
        total_score,
        correct_count,
        wrong_count,
        empty_count,
        review_notes || null,
        userId,
        submission_id
      ]
    );

    res.json({ success: true, message: 'Cập nhật thành công', data: { total_score, correct_count, wrong_count, empty_count } });

  } catch (error) {
    console.error('Update submission after review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ===== TEMPLATE CONTROLLERS =====
 * Generate PDF phiếu trả lời
 */

// Generate phiếu trả lời cho một sinh viên
exports.generateAnswerSheet = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const { student_id } = req.body;
    const userId = req.user.id;

    // Validate batch
    const [batches] = await database.query(
      `SELECT eb.*, q.title as quiz_title
       FROM exam_batches eb
       JOIN quizzes q ON eb.quiz_id = q.id
       WHERE eb.id = ? AND eb.is_deleted = FALSE`,
      [batch_id]
    );

    const batch = batches[0];
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    // Check quyền
    const classroom = await Classroom.findById(batch.classroom_id);
    if (classroom.teacher_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo phiếu' });
    }

    // Lấy thông tin sinh viên
    const [students] = await database.query(
      `SELECT * FROM students WHERE id = ?`,
      [student_id]
    );

    const student = students[0];
    if (!student) {
      return res.status(404).json({ success: false, message: 'Sinh viên không tồn tại' });
    }

    // Generate PDF - dùng mã đề (access_code) của batch, nếu chưa có thì sinh 3 số ngẫu nhiên
    const examCode = batch.access_code || generateThreeDigitCode();
    const pdfPath = await templateService.generateAnswerSheet({
      batch_id,
      student_id,
      student_code: student.student_code,
      student_name: student.full_name,
      exam_name: batch.quiz_title,
      exam_code: examCode
    });

    // Build full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const pdfUrl = `${baseUrl}${pdfPath}`;

    res.json({
      success: true,
      message: 'Tạo phiếu thành công',
      data: { pdf_url: pdfUrl }
    });

  } catch (error) {
    console.error('Generate answer sheet error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate hàng loạt cho tất cả sinh viên trong classroom
exports.generateBulkAnswerSheets = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const userId = req.user.id;

    // Validate batch
    const [batches] = await database.query(
      `SELECT eb.*, q.title as quiz_title
       FROM exam_batches eb
       JOIN quizzes q ON eb.quiz_id = q.id
       WHERE eb.id = ? AND eb.is_deleted = FALSE`,
      [batch_id]
    );

    const batch = batches[0];
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    // Check quyền
    const classroom = await Classroom.findById(batch.classroom_id);
    if (classroom.teacher_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo phiếu' });
    }

    // Lấy danh sách sinh viên trong classroom
    const [students] = await database.query(
      `SELECT s.id, s.student_code, s.full_name as name
       FROM classroom_students cs
       JOIN students s ON cs.student_id = s.id
       WHERE cs.classroom_id = ?`,
      [batch.classroom_id]
    );

    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'Classroom chưa có sinh viên' });
    }

    // Generate bulk - dùng mã đề (access_code) của batch, nếu chưa có thì sinh 3 số ngẫu nhiên
    const examCode = batch.access_code || generateThreeDigitCode();
    const results = await templateService.generateBulkAnswerSheets({
      batch_id,
      students,
      exam_name: batch.quiz_title,
      exam_code: examCode
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Tạo ${successCount}/${students.length} phiếu thành công`,
      data: { results, total: students.length, success: successCount, failed: failCount }
    });

  } catch (error) {
    console.error('Generate bulk answer sheets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/omr/answer-key/batch/:batch_id
 * Trả về đáp án chuẩn của một đợt thi theo mã đề (exam_code)
 * Query param: exam_code (tùy chọn - dùng để xác minh)
 */
exports.getAnswerKeyByExamCode = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const { exam_code } = req.query;
    const userId = req.user.id;

    // Lấy thông tin batch
    const [batches] = await database.query(
      `SELECT eb.*, q.title as quiz_title, q.id as quiz_id, q.exam_code as quiz_exam_code
       FROM exam_batches eb
       JOIN quizzes q ON eb.quiz_id = q.id
       WHERE eb.id = ? AND eb.is_deleted = FALSE`,
      [batch_id]
    );

    const batch = batches[0];
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Exam batch không tồn tại' });
    }

    // Mã đề hiển thị: ưu tiên access_code của batch (nếu hợp lệ), fallback về exam_code của quiz
    const effectiveExamCode = (batch.access_code && batch.access_code !== 'string')
      ? batch.access_code
      : batch.quiz_exam_code;

    // Nếu truyền exam_code thì kiểm tra có khớp với mã đề không
    if (exam_code && effectiveExamCode && String(exam_code) !== String(effectiveExamCode)) {
      return res.status(404).json({
        success: false,
        message: `Mã đề "${exam_code}" không khớp với đợt thi này (mã đề: ${effectiveExamCode})`
      });
    }

    // Lấy answer key
    const [answerKeyRows] = await database.query(
      'SELECT * FROM answer_keys WHERE quiz_id = ? ORDER BY created_at DESC LIMIT 1',
      [batch.quiz_id]
    );

    if (answerKeyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chưa có đáp án cho đợt thi này' });
    }

    const answerKey = answerKeyRows[0];
    const correctAnswers = typeof answerKey.correct_answers === 'string'
      ? JSON.parse(answerKey.correct_answers)
      : answerKey.correct_answers;

    // Tổng hợp thông tin trả về
    const totalQuestions = Object.keys(correctAnswers).length;
    const mappedAnswers = Object.entries(correctAnswers)
      .filter(([, v]) => v !== null)
      .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

    let scorePer = answerKey.score_per_question
      ? (typeof answerKey.score_per_question === 'string'
          ? JSON.parse(answerKey.score_per_question)
          : answerKey.score_per_question)
      : null;

    let defaultScore = answerKey.default_score_per_question;

    // Nếu DB chưa có điểm (data cũ), lấy trực tiếp từ bảng questions
    if (!scorePer || !defaultScore) {
      const [questionRows] = await database.query(
        `SELECT point FROM questions WHERE quiz_id = ? AND is_deleted = FALSE ORDER BY created_at`,
        [batch.quiz_id]
      );
      if (questionRows.length > 0) {
        scorePer = {};
        questionRows.forEach((q, idx) => {
          scorePer[idx + 1] = q.point || 1;
        });
        defaultScore = questionRows[0].point || 1;
      }
    }

    res.json({
      success: true,
      data: {
        batch_id,
        quiz_id: batch.quiz_id,
        exam_code: effectiveExamCode || null,
        quiz_title: batch.quiz_title,
        total_questions: totalQuestions,
        mapped_questions: Object.keys(mappedAnswers).length,
        correct_answers: correctAnswers,
        score_per_question: scorePer,
        default_score_per_question: defaultScore
      }
    });

  } catch (error) {
    console.error('Get answer key by exam code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download template trống (không có thông tin sinh viên)
exports.downloadBlankTemplate = async (req, res) => {
  try {
    const { exam_name, exam_code } = req.query;

    const pdfBuffer = await templateService.generateBlankTemplate({
      exam_name: exam_name || 'Bài kiểm tra trắc nghiệm',
      exam_code: exam_code || '___'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="phieu-tra-loi-trang.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download blank template error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
