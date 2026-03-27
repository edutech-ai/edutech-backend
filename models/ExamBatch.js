const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class ExamBatch {
  // Tạo đợt thi mới
  static async create({
    quiz_id,
    classroom_id,
    template_id,
    name,
    description,
    batch_type = 'exam',
    access_code = null,
    max_attempts = 1,
    time_limit_minutes = null,
    passing_score = 5.0,
    total_score = 10.0,
    start_at,
    end_at,
    created_by
  }) {
    const batchId = uuidv7();
    const query = `
      INSERT INTO exam_batches
      (id, quiz_id, classroom_id, template_id, name, description, batch_type,
       access_code, max_attempts, time_limit_minutes, passing_score, total_score,
       start_at, end_at, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `;

    await db.execute(query, [
      batchId,
      quiz_id,
      classroom_id,
      template_id,
      name,
      description,
      batch_type,
      access_code,
      max_attempts,
      time_limit_minutes,
      passing_score,
      total_score,
      start_at,
      end_at,
      created_by
    ]);

    return this.findById(batchId);
  }

  // Lấy batch theo ID
  static async findById(id) {
    const query = `
      SELECT eb.*, 
             q.title as quiz_title,
             c.name as classroom_name,
             at.name as template_name
      FROM exam_batches eb
      LEFT JOIN quizzes q ON eb.quiz_id = q.id
      LEFT JOIN classrooms c ON eb.classroom_id = c.id
      LEFT JOIN answer_templates at ON eb.template_id = at.id
      WHERE eb.id = ? AND eb.is_deleted = FALSE
    `;
    const [rows] = await db.execute(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  // Lấy batches theo classroom
  static async findByClassroom(classroom_id, { status = null, batch_type = null } = {}) {
    let query = `
      SELECT eb.*, 
             q.title as quiz_title,
             at.name as template_name
      FROM exam_batches eb
      LEFT JOIN quizzes q ON eb.quiz_id = q.id
      LEFT JOIN answer_templates at ON eb.template_id = at.id
      WHERE eb.classroom_id = ? AND eb.is_deleted = FALSE
    `;
    const params = [classroom_id];

    if (status) {
      query += ' AND eb.status = ?';
      params.push(status);
    }

    if (batch_type) {
      query += ' AND eb.batch_type = ?';
      params.push(batch_type);
    }

    query += ' ORDER BY eb.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Lấy batches theo quiz
  static async findByQuiz(quiz_id) {
    const query = `
      SELECT eb.*, 
             c.name as classroom_name,
             at.name as template_name
      FROM exam_batches eb
      LEFT JOIN classrooms c ON eb.classroom_id = c.id
      LEFT JOIN answer_templates at ON eb.template_id = at.id
      WHERE eb.quiz_id = ? AND eb.is_deleted = FALSE
      ORDER BY eb.created_at DESC
    `;
    const [rows] = await db.execute(query, [quiz_id]);
    return rows;
  }

  // Lấy batches theo teacher
  static async findByTeacher(teacher_id, { status = null } = {}) {
    let query = `
      SELECT eb.*, 
             q.title as quiz_title,
             c.name as classroom_name,
             at.name as template_name
      FROM exam_batches eb
      LEFT JOIN quizzes q ON eb.quiz_id = q.id
      LEFT JOIN classrooms c ON eb.classroom_id = c.id
      LEFT JOIN answer_templates at ON eb.template_id = at.id
      WHERE eb.created_by = ? AND eb.is_deleted = FALSE
    `;
    const params = [teacher_id];

    if (status) {
      query += ' AND eb.status = ?';
      params.push(status);
    }

    query += ' ORDER BY eb.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Update batch
  static async update(id, updates) {
    const allowedFields = [
      'name', 'description', 'batch_type', 'access_code', 'max_attempts',
      'time_limit_minutes', 'passing_score', 'total_score', 'start_at', 'end_at', 'status'
    ];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `UPDATE exam_batches SET ${fields.join(', ')} WHERE id = ?`;
    await db.execute(query, values);

    return this.findById(id);
  }

  // Cập nhật trạng thái
  static async updateStatus(id, status) {
    const query = 'UPDATE exam_batches SET status = ? WHERE id = ?';
    await db.execute(query, [status, id]);
    return this.findById(id);
  }

  // Cập nhật thống kê submissions
  static async updateSubmissionStats(id) {
    const query = `
      UPDATE exam_batches 
      SET 
        total_submissions = (SELECT COUNT(*) FROM submissions WHERE batch_id = ?),
        processed_submissions = (SELECT COUNT(*) FROM submissions WHERE batch_id = ? AND processing_status = 'completed')
      WHERE id = ?
    `;
    await db.execute(query, [id, id, id]);
    return this.findById(id);
  }

  // Soft delete
  static async delete(id) {
    const query = 'UPDATE exam_batches SET is_deleted = TRUE WHERE id = ?';
    await db.execute(query, [id]);
    return true;
  }

  // Check nếu batch đang mở
  static async isOpen(id) {
    const batch = await this.findById(id);
    if (!batch) return false;

    const now = new Date();
    const startAt = batch.start_at ? new Date(batch.start_at) : null;
    const endAt = batch.end_at ? new Date(batch.end_at) : null;

    if (batch.status !== 'open') return false;
    if (startAt && now < startAt) return false;
    if (endAt && now > endAt) return false;

    return true;
  }

  // Lấy danh sách students trong batch
  static async getStudents(id) {
    const query = `
      SELECT DISTINCT s.*, 
             sub.id as submission_id,
             sub.processing_status,
             sub.total_score,
             sub.submitted_at
      FROM students s
      INNER JOIN classroom_students cs ON s.id = cs.student_id
      INNER JOIN exam_batches eb ON cs.classroom_id = eb.classroom_id
      LEFT JOIN submissions sub ON sub.batch_id = eb.id AND sub.student_id = s.id
      WHERE eb.id = ?
      ORDER BY s.student_code
    `;
    const [rows] = await db.execute(query, [id]);
    return rows;
  }

  // Lấy thống kê batch
  static async getStats(id) {
    const query = `
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN processing_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN processing_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN processing_status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN needs_review = TRUE THEN 1 ELSE 0 END) as needs_review,
        AVG(CASE WHEN processing_status = 'completed' THEN total_score END) as avg_score,
        MAX(total_score) as max_score,
        MIN(CASE WHEN processing_status = 'completed' THEN total_score END) as min_score
      FROM submissions
      WHERE batch_id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }
}

module.exports = ExamBatch;
