const db = require('../config/database');

class ClassroomStudent {
  // Thêm học sinh vào lớp
  static async create({ classroom_id, student_id, status = 'active' }) {
    await db.query(
      `INSERT INTO classroom_students (classroom_id, student_id, joined_at, status)
       VALUES (?, ?, NOW(), ?)`,
      [classroom_id, student_id, status]
    );
  }

  // Kiểm tra học sinh đã có trong lớp chưa
  static async exists(classroomId, studentId) {
    const [rows] = await db.query(
      'SELECT * FROM classroom_students WHERE classroom_id = ? AND student_id = ?',
      [classroomId, studentId]
    );
    return rows[0];
  }

  // Lấy danh sách học sinh trong lớp
  static async findByClassroomId(classroomId, status = null) {
    let query = `
      SELECT cs.*, s.full_name, s.student_code, s.phone_number, s.parent_phone_number, s.is_active
      FROM classroom_students cs
      JOIN students s ON cs.student_id = s.id
      WHERE cs.classroom_id = ?
    `;
    const params = [classroomId];

    if (status) {
      query += ' AND cs.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cs.joined_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Cập nhật trạng thái học sinh trong lớp
  static async updateStatus(classroomId, studentId, status) {
    await db.query(
      'UPDATE classroom_students SET status = ? WHERE classroom_id = ? AND student_id = ?',
      [status, classroomId, studentId]
    );
  }

  // Xóa học sinh khỏi lớp
  static async delete(classroomId, studentId) {
    await db.query(
      'DELETE FROM classroom_students WHERE classroom_id = ? AND student_id = ?',
      [classroomId, studentId]
    );
  }

  // Xóa tất cả học sinh trong lớp
  static async deleteByClassroomId(classroomId) {
    await db.query(
      'DELETE FROM classroom_students WHERE classroom_id = ?',
      [classroomId]
    );
  }

  // Xóa tất cả lớp của học sinh
  static async deleteByStudentId(studentId) {
    await db.query(
      'DELETE FROM classroom_students WHERE student_id = ?',
      [studentId]
    );
  }
}

module.exports = ClassroomStudent;
