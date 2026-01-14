const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class Quiz {
  // Tạo quiz mới
  static async create({ teacher_id, title, description, difficulty = 'medium', exam_code, qr_code, status = 'draft' }) {
    const quizId = uuidv7();
    
    await db.query(
      `INSERT INTO quizzes (id, teacher_id, title, description, difficulty, exam_code, qr_code, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [quizId, teacher_id, title, description, difficulty, exam_code, qr_code, status]
    );
    
    return quizId;
  }

  // Tìm quiz theo ID
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT * FROM quizzes WHERE id = ? AND is_deleted = FALSE`,
      [id]
    );
    return rows[0];
  }

  // Lấy tất cả quiz của một giáo viên
  static async findByTeacherId(teacherId, filters = {}) {
    let query = `SELECT * FROM quizzes WHERE teacher_id = ? AND is_deleted = FALSE`;
    const params = [teacherId];

    // Filter by status
    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    // Filter by difficulty
    if (filters.difficulty) {
      query += ` AND difficulty = ?`;
      params.push(filters.difficulty);
    }

    // Search by title
    if (filters.search) {
      query += ` AND title LIKE ?`;
      params.push(`%${filters.search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    // Pagination
    if (filters.limit) {
      const limit = parseInt(filters.limit);
      const offset = filters.page ? (parseInt(filters.page) - 1) * limit : 0;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Lấy tất cả quiz công khai (cho học sinh)
  static async findPublicQuizzes(filters = {}) {
    let query = `SELECT q.*, u.email as teacher_email 
                 FROM quizzes q 
                 JOIN users u ON q.teacher_id = u.id 
                 WHERE q.status = 'public' AND q.is_deleted = FALSE`;
    const params = [];

    // Filter by difficulty
    if (filters.difficulty) {
      query += ` AND q.difficulty = ?`;
      params.push(filters.difficulty);
    }

    // Search by title
    if (filters.search) {
      query += ` AND q.title LIKE ?`;
      params.push(`%${filters.search}%`);
    }

    query += ` ORDER BY q.created_at DESC`;

    // Pagination
    if (filters.limit) {
      const limit = parseInt(filters.limit);
      const offset = filters.page ? (parseInt(filters.page) - 1) * limit : 0;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Tìm quiz theo exam_code
  static async findByExamCode(examCode) {
    const [rows] = await db.query(
      `SELECT * FROM quizzes WHERE exam_code = ? AND is_deleted = FALSE`,
      [examCode]
    );
    return rows[0];
  }

  // Cập nhật quiz
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.difficulty !== undefined) {
      fields.push('difficulty = ?');
      values.push(data.difficulty);
    }
    if (data.exam_code !== undefined) {
      fields.push('exam_code = ?');
      values.push(data.exam_code);
    }
    if (data.qr_code !== undefined) {
      fields.push('qr_code = ?');
      values.push(data.qr_code);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return;

    values.push(id);
    
    await db.query(
      `UPDATE quizzes SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`,
      values
    );

    return this.findById(id);
  }

  // Soft delete quiz
  static async delete(id) {
    await db.query(
      `UPDATE quizzes SET is_deleted = TRUE WHERE id = ?`,
      [id]
    );
  }

  // Hard delete quiz (cẩn thận!)
  static async hardDelete(id) {
    await db.query(`DELETE FROM quizzes WHERE id = ?`, [id]);
  }

  // Đếm số lượng câu hỏi trong quiz
  static async countQuestions(quizId) {
    const [rows] = await db.query(
      `SELECT COUNT(*) as total FROM questions WHERE quiz_id = ? AND is_deleted = FALSE`,
      [quizId]
    );
    return rows[0].total;
  }

  // Tính tổng điểm của quiz
  static async getTotalPoints(quizId) {
    const [rows] = await db.query(
      `SELECT SUM(point) as total_points FROM questions WHERE quiz_id = ? AND is_deleted = FALSE`,
      [quizId]
    );
    return rows[0].total_points || 0;
  }

  // Lấy quiz với thông tin chi tiết (bao gồm số câu hỏi, tổng điểm)
  static async findByIdWithDetails(id) {
    const quiz = await this.findById(id);
    if (!quiz) return null;

    const questionCount = await this.countQuestions(id);
    const totalPoints = await this.getTotalPoints(id);

    return {
      ...quiz,
      question_count: questionCount,
      total_points: totalPoints
    };
  }

  // Đếm tổng số quiz của giáo viên
  static async countByTeacherId(teacherId, filters = {}) {
    let query = `SELECT COUNT(*) as total FROM quizzes WHERE teacher_id = ? AND is_deleted = FALSE`;
    const params = [teacherId];

    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }
}

module.exports = Quiz;
