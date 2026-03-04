const db = require('../config/database');

class Submission {
  // Tạo submission mới
  static async create({
    batch_id,
    student_id,
    student_code = null,
    exam_code = null,
    qr_detected = false,
    qr_data = null,
    student_code_source = 'qr',
    original_image_url,
    thumbnail_url = null
  }) {
    const query = `
      INSERT INTO submissions 
      (batch_id, student_id, student_code, exam_code, qr_detected, qr_data, 
       student_code_source, original_image_url, thumbnail_url, processing_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    
    const [result] = await db.execute(query, [
      batch_id,
      student_id,
      student_code,
      exam_code,
      qr_detected,
      qr_data ? JSON.stringify(qr_data) : null,
      student_code_source,
      original_image_url,
      thumbnail_url
    ]);

    return this.findById(result.insertId);
  }

  // Lấy submission theo ID
  static async findById(id) {
    const query = `
      SELECT s.*, 
             st.student_code as student_number,
             st.full_name as student_name,
             eb.name as batch_name,
             eb.quiz_id,
             q.title as quiz_title
      FROM submissions s
      LEFT JOIN students st ON s.student_id = st.id
      LEFT JOIN exam_batches eb ON s.batch_id = eb.id
      LEFT JOIN quizzes q ON eb.quiz_id = q.id
      WHERE s.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) return null;
    
    const submission = rows[0];
    if (submission.qr_data) submission.qr_data = JSON.parse(submission.qr_data);
    if (submission.detected_answers) submission.detected_answers = JSON.parse(submission.detected_answers);
    
    return submission;
  }

  // Lấy submissions theo batch
  static async findByBatch(batch_id, { processing_status = null, needs_review = null } = {}) {
    let query = `
      SELECT s.*, 
             st.student_code as student_number,
             st.full_name as student_name
      FROM submissions s
      LEFT JOIN students st ON s.student_id = st.id
      WHERE s.batch_id = ?
    `;
    const params = [batch_id];

    if (processing_status) {
      query += ' AND s.processing_status = ?';
      params.push(processing_status);
    }

    if (needs_review !== null) {
      query += ' AND s.needs_review = ?';
      params.push(needs_review);
    }

    query += ' ORDER BY s.submitted_at DESC';

    const [rows] = await db.execute(query, params);
    return rows.map(row => ({
      ...row,
      qr_data: row.qr_data ? JSON.parse(row.qr_data) : null,
      detected_answers: row.detected_answers ? JSON.parse(row.detected_answers) : null
    }));
  }

  // Lấy submission theo student và batch
  static async findByStudentAndBatch(student_id, batch_id) {
    const query = `
      SELECT s.* 
      FROM submissions s
      WHERE s.student_id = ? AND s.batch_id = ?
      ORDER BY s.submitted_at DESC
      LIMIT 1
    `;
    const [rows] = await db.execute(query, [student_id, batch_id]);
    
    if (rows.length === 0) return null;
    
    const submission = rows[0];
    if (submission.qr_data) submission.qr_data = JSON.parse(submission.qr_data);
    if (submission.detected_answers) submission.detected_answers = JSON.parse(submission.detected_answers);
    
    return submission;
  }

  // Update submission
  static async update(id, updates) {
    const allowedFields = [
      'student_code', 'exam_code', 'qr_detected', 'qr_data', 'student_code_source',
      'processed_image_url', 'thumbnail_url', 'detected_answers',
      'total_score', 'correct_count', 'wrong_count', 'empty_count',
      'processing_status', 'accuracy_score', 'needs_review', 'review_reason',
      'review_notes', 'reviewed_by', 'teacher_notes', 'processing_time_ms',
      'error_message', 'processed_at', 'reviewed_at'
    ];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        
        if (key === 'qr_data' || key === 'detected_answers') {
          values.push(value ? JSON.stringify(value) : null);
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `UPDATE submissions SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(query, values);

    return this.findById(id);
  }

  // Update trạng thái processing
  static async updateProcessingStatus(id, status, errorMessage = null) {
    const updates = {
      processing_status: status,
      error_message: errorMessage
    };

    if (status === 'completed' || status === 'failed') {
      updates.processed_at = new Date();
    }

    return this.update(id, updates);
  }

  // Update kết quả sau khi xử lý OMR
  static async updateResult(id, {
    detected_answers,
    total_score,
    correct_count,
    wrong_count,
    empty_count,
    accuracy_score,
    processed_image_url,
    processing_time_ms
  }) {
    return this.update(id, {
      detected_answers,
      total_score,
      correct_count,
      wrong_count,
      empty_count,
      accuracy_score,
      processed_image_url,
      processing_time_ms,
      processing_status: 'completed',
      processed_at: new Date()
    });
  }

  // Mark cần review
  static async markForReview(id, reason) {
    return this.update(id, {
      needs_review: true,
      review_reason: reason,
      processing_status: 'manual_review'
    });
  }

  // Complete review
  static async completeReview(id, {
    reviewed_by,
    review_notes,
    detected_answers = null,
    total_score = null
  }) {
    const updates = {
      reviewed_by,
      review_notes,
      reviewed_at: new Date(),
      needs_review: false,
      processing_status: 'completed'
    };

    if (detected_answers) updates.detected_answers = detected_answers;
    if (total_score !== null) updates.total_score = total_score;

    return this.update(id, updates);
  }

  // Lấy submission details
  static async getDetails(submission_id) {
    const query = `
      SELECT sd.*, q.question_text, q.question_number
      FROM submission_details sd
      LEFT JOIN questions q ON sd.question_id = q.id
      WHERE sd.submission_id = ?
      ORDER BY sd.question_number
    `;
    const [rows] = await db.execute(query, [submission_id]);
    return rows.map(row => ({
      ...row,
      detection_metadata: row.detection_metadata ? JSON.parse(row.detection_metadata) : null
    }));
  }

  // Lưu chi tiết từng câu
  static async saveDetails(submission_id, details) {
    // details là array: [{question_id, question_number, detected_answer, correct_answer, is_correct, score_earned, detection_confidence, detection_metadata}, ...]
    
    if (details.length === 0) return;

    const query = `
      INSERT INTO submission_details 
      (submission_id, question_id, question_number, detected_answer, correct_answer, 
       is_correct, score_earned, detection_confidence, detection_metadata)
      VALUES ?
    `;

    const values = details.map(d => [
      submission_id,
      d.question_id,
      d.question_number,
      d.detected_answer,
      d.correct_answer,
      d.is_correct,
      d.score_earned,
      d.detection_confidence || null,
      d.detection_metadata ? JSON.stringify(d.detection_metadata) : null
    ]);

    await db.query(query, [values]);
    return true;
  }

  // Delete submission
  static async delete(id) {
    // Xóa details trước
    await db.execute('DELETE FROM submission_details WHERE submission_id = ?', [id]);
    
    // Xóa submission
    await db.execute('DELETE FROM submissions WHERE id = ?', [id]);
    return true;
  }

  // Lấy submissions cần review
  static async getNeedingReview({ limit = 50, offset = 0 } = {}) {
    const query = `
      SELECT s.*, 
             st.student_code as student_number,
             st.full_name as student_name,
             eb.name as batch_name,
             q.title as quiz_title
      FROM submissions s
      LEFT JOIN students st ON s.student_id = st.id
      LEFT JOIN exam_batches eb ON s.batch_id = eb.id
      LEFT JOIN quizzes q ON eb.quiz_id = q.id
      WHERE s.needs_review = TRUE
      ORDER BY s.submitted_at ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(query, [limit, offset]);
    return rows;
  }

  // Thống kê theo batch
  static async getStatsByBatch(batch_id) {
    const query = `
      SELECT 
        COUNT(*) as total,
        AVG(total_score) as avg_score,
        MAX(total_score) as max_score,
        MIN(total_score) as min_score,
        AVG(correct_count) as avg_correct,
        AVG(accuracy_score) as avg_accuracy,
        SUM(CASE WHEN needs_review = TRUE THEN 1 ELSE 0 END) as needs_review_count
      FROM submissions
      WHERE batch_id = ? AND processing_status = 'completed'
    `;
    const [rows] = await db.execute(query, [batch_id]);
    return rows[0];
  }
}

module.exports = Submission;
