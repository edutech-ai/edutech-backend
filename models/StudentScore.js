const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class StudentScore {
  // Tạo điểm mới
  static async create({ classroom_id, student_id, quiz_id, score, max_score, subject, exam_name, exam_type, exam_date, notes }) {
    const scoreId = uuidv7();
    
    await db.query(
      `INSERT INTO student_scores 
       (id, classroom_id, student_id, quiz_id, score, max_score, subject, exam_name, exam_type, exam_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scoreId, classroom_id, student_id, quiz_id, score, max_score || 10, subject, exam_name, exam_type, exam_date, notes]
    );
    
    return scoreId;
  }

  // Tìm điểm theo ID
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM student_scores WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Lấy điểm của học sinh trong lớp
  static async findByClassroomStudent(classroomId, studentId, filters = {}) {
    let query = `
      SELECT ss.*, q.title as quiz_title
      FROM student_scores ss
      LEFT JOIN quizzes q ON ss.quiz_id = q.id
      WHERE ss.classroom_id = ? AND ss.student_id = ?
    `;
    const params = [classroomId, studentId];

    if (filters.subject) {
      query += ' AND ss.subject = ?';
      params.push(filters.subject);
    }

    if (filters.exam_type) {
      query += ' AND ss.exam_type = ?';
      params.push(filters.exam_type);
    }

    if (filters.from_date) {
      query += ' AND ss.exam_date >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND ss.exam_date <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY ss.exam_date DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Lấy tất cả điểm của lớp
  static async findByClassroom(classroomId, filters = {}) {
    let query = `
      SELECT ss.*, s.full_name, s.student_code, q.title as quiz_title
      FROM student_scores ss
      JOIN students s ON ss.student_id = s.id
      LEFT JOIN quizzes q ON ss.quiz_id = q.id
      WHERE ss.classroom_id = ?
    `;
    const params = [classroomId];

    if (filters.subject) {
      query += ' AND ss.subject = ?';
      params.push(filters.subject);
    }

    if (filters.exam_type) {
      query += ' AND ss.exam_type = ?';
      params.push(filters.exam_type);
    }

    query += ' ORDER BY ss.exam_date DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Đếm số điểm
  static async count(classroomId, studentId = null) {
    let query = 'SELECT COUNT(*) as count FROM student_scores WHERE classroom_id = ?';
    const params = [classroomId];

    if (studentId) {
      query += ' AND student_id = ?';
      params.push(studentId);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count;
  }

  // Cập nhật điểm
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.score !== undefined) {
      fields.push('score = ?');
      values.push(data.score);
    }
    if (data.max_score !== undefined) {
      fields.push('max_score = ?');
      values.push(data.max_score);
    }
    if (data.subject !== undefined) {
      fields.push('subject = ?');
      values.push(data.subject);
    }
    if (data.exam_name !== undefined) {
      fields.push('exam_name = ?');
      values.push(data.exam_name);
    }
    if (data.exam_type !== undefined) {
      fields.push('exam_type = ?');
      values.push(data.exam_type);
    }
    if (data.exam_date !== undefined) {
      fields.push('exam_date = ?');
      values.push(data.exam_date);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.query(
      `UPDATE student_scores SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Xóa điểm
  static async delete(id) {
    await db.query('DELETE FROM student_scores WHERE id = ?', [id]);
  }

  // Tính toán thống kê điểm
  static async getStatistics(classroomId, studentId) {
    const [rows] = await db.query(
      `SELECT 
        COUNT(*) as total_exams,
        AVG(score) as average_score,
        MAX(score) as highest_score,
        MIN(score) as lowest_score
       FROM student_scores 
       WHERE classroom_id = ? AND student_id = ?`,
      [classroomId, studentId]
    );
    return rows[0];
  }
}

module.exports = StudentScore;
