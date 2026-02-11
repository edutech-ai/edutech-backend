const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');
const { generateRandomCode } = require('../utils/code_generator');
const { generateQRCodeDataURL } = require('../utils/qr_generator');

class Quiz {
  // Tạo quiz mới
  static async create({
    teacher_id,
    title,
    description,
    difficulty = 'medium',
    exam_code,
    qr_code,
    status = 'draft',
    visibility = 'private',
    subject,
    grade,
    duration,
    min_attempts = 1,
    max_attempts = null
  }) {
    const quizId = uuidv7();

    // Auto-generate exam_code if not provided
    if (!exam_code) {
      // tạo mã exam_code để quản lí quiz, sau này có thể thêm pass để học sinh tham gia quiz
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const candidateCode = generateRandomCode(8);
        const existing = await this.findByExamCode(candidateCode);

        if (!existing) {
          exam_code = candidateCode;
          break;
        }
        attempts++;
      }

      if (!exam_code) {
        throw new Error('Failed to generate unique exam code. Please try again.');
      }
    }

    // Auto-generate QR code if not provided
    if (!qr_code && exam_code) {
      try {
        qr_code = await generateQRCodeDataURL(exam_code);
      } catch (error) {
        console.error('QR code generation failed:', error);
        // Continue without QR code if generation fails
      }
    }

    await db.query(
      `INSERT INTO quizzes (id, teacher_id, title, description, difficulty, exam_code, qr_code, status, visibility, subject, grade, duration, min_attempts, max_attempts) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quizId, teacher_id, title, description, difficulty, exam_code, qr_code, status, visibility, subject, grade, duration, min_attempts, max_attempts]
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

    if (filters.subject) {
      query += ` AND subject = ?`;
      params.push(filters.subject);
    }

    if (filters.grade) {
      query += ` AND grade = ?`;
      params.push(parseInt(filters.grade));
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

  // Lấy tất cả quiz cộng đồng (cho mọi người)
  static async findPublicQuizzes(filters = {}) {
    let query = `SELECT q.*, u.email as teacher_email, p.name as teacher_name
                 FROM quizzes q
                 JOIN users u ON q.teacher_id = u.id
                 LEFT JOIN user_profiles p ON u.id = p.user_id
                 WHERE q.visibility = 'community' AND q.is_deleted = FALSE`;
    const params = [];

    // Filter by difficulty
    if (filters.difficulty) {
      query += ` AND q.difficulty = ?`;
      params.push(filters.difficulty);
    }

    if (filters.subject) {
      query += ` AND q.subject = ?`;
      params.push(filters.subject);
    }

    if (filters.grade) {
      query += ` AND q.grade = ?`;
      params.push(parseInt(filters.grade));
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
    if (data.visibility !== undefined) {
      fields.push('visibility = ?');
      values.push(data.visibility);
    }
    if (data.subject !== undefined) {
      fields.push('subject = ?');
      values.push(data.subject);
    }
    if (data.grade !== undefined) {
      fields.push('grade = ?');
      values.push(data.grade);
    }
    if (data.duration !== undefined) {
      fields.push('duration = ?');
      values.push(data.duration);
    }
    if (data.min_attempts !== undefined) {
      fields.push('min_attempts = ?');
      values.push(data.min_attempts);
    }
    if (data.max_attempts !== undefined) {
      fields.push('max_attempts = ?');
      values.push(data.max_attempts);
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
