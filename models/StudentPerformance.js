const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class StudentPerformance {
  // Tạo hoặc cập nhật performance
  static async upsert({ classroom_id, student_id, total_exams, average_score, subject_performance, strong_topic, weak_topic }) {
    const existing = await this.findOne(classroom_id, student_id);
    
    if (existing) {
      // Update
      return await this.update(classroom_id, student_id, {
        total_exams,
        average_score,
        subject_performance,
        strong_topic,
        weak_topic
      });
    } else {
      // Create
      const performanceId = uuidv7();
      await db.query(
        `INSERT INTO student_performance 
         (id, classroom_id, student_id, total_exams, average_score, subject_performance, strong_topic, weak_topic, last_calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          performanceId,
          classroom_id,
          student_id,
          total_exams || 0,
          average_score,
          JSON.stringify(subject_performance),
          JSON.stringify(strong_topic),
          JSON.stringify(weak_topic)
        ]
      );
      return performanceId;
    }
  }

  // Tìm performance của học sinh trong lớp
  static async findOne(classroomId, studentId) {
    const [rows] = await db.query(
      `SELECT * FROM student_performance 
       WHERE classroom_id = ? AND student_id = ?`,
      [classroomId, studentId]
    );
    
    if (rows[0]) {
      // Parse JSON fields
      rows[0].subject_performance = rows[0].subject_performance ? JSON.parse(rows[0].subject_performance) : null;
      rows[0].strong_topic = rows[0].strong_topic ? JSON.parse(rows[0].strong_topic) : null;
      rows[0].weak_topic = rows[0].weak_topic ? JSON.parse(rows[0].weak_topic) : null;
    }
    
    return rows[0];
  }

  // Cập nhật performance
  static async update(classroomId, studentId, data) {
    const fields = [];
    const values = [];

    if (data.total_exams !== undefined) {
      fields.push('total_exams = ?');
      values.push(data.total_exams);
    }
    if (data.average_score !== undefined) {
      fields.push('average_score = ?');
      values.push(data.average_score);
    }
    if (data.subject_performance !== undefined) {
      fields.push('subject_performance = ?');
      values.push(JSON.stringify(data.subject_performance));
    }
    if (data.strong_topic !== undefined) {
      fields.push('strong_topic = ?');
      values.push(JSON.stringify(data.strong_topic));
    }
    if (data.weak_topic !== undefined) {
      fields.push('weak_topic = ?');
      values.push(JSON.stringify(data.weak_topic));
    }

    fields.push('last_calculated_at = NOW()');

    if (fields.length > 1) {
      values.push(classroomId, studentId);
      await db.query(
        `UPDATE student_performance SET ${fields.join(', ')} 
         WHERE classroom_id = ? AND student_id = ?`,
        values
      );
    }
  }

  // Lấy bảng xếp hạng lớp
  static async getLeaderboard(classroomId, limit = 20) {
    const [rows] = await db.query(
      `SELECT sp.*, s.full_name, s.student_code
       FROM student_performance sp
       JOIN students s ON sp.student_id = s.id
       WHERE sp.classroom_id = ?
       ORDER BY sp.average_score DESC
       LIMIT ?`,
      [classroomId, limit]
    );

    // Parse JSON fields
    return rows.map(row => ({
      ...row,
      subject_performance: row.subject_performance ? JSON.parse(row.subject_performance) : null,
      strong_topic: row.strong_topic ? JSON.parse(row.strong_topic) : null,
      weak_topic: row.weak_topic ? JSON.parse(row.weak_topic) : null
    }));
  }

  // Xóa performance của lớp
  static async deleteByClassroomId(classroomId) {
    await db.query(
      'DELETE FROM student_performance WHERE classroom_id = ?',
      [classroomId]
    );
  }

  // Xóa performance của học sinh
  static async deleteByStudentId(studentId) {
    await db.query(
      'DELETE FROM student_performance WHERE student_id = ?',
      [studentId]
    );
  }

  // Xóa performance cụ thể
  static async delete(classroomId, studentId) {
    await db.query(
      'DELETE FROM student_performance WHERE classroom_id = ? AND student_id = ?',
      [classroomId, studentId]
    );
  }
}

module.exports = StudentPerformance;
