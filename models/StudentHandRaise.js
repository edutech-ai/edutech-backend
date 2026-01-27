const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class StudentHandRaise {
  // Tạo record mới khi lần đầu giơ tay
  static async create({ classroom_id, student_id, total_hand_raises = 1 }) {
    const handRaiseId = uuidv7();
    await db.query(
      `INSERT INTO student_hand_raises 
       (id, classroom_id, student_id, total_hand_raises)
       VALUES (?, ?, ?, ?)`,
      [handRaiseId, classroom_id, student_id, total_hand_raises]
    );
    return handRaiseId;
  }

  // Tìm record theo classroom và student
  static async findOne(classroomId, studentId) {
    const [rows] = await db.query(
      `SELECT * FROM student_hand_raises 
       WHERE classroom_id = ? AND student_id = ?`,
      [classroomId, studentId]
    );
    return rows[0];
  }

  // Tăng số lần giơ tay (+1)
  static async increment(classroomId, studentId) {
    const existing = await this.findOne(classroomId, studentId);
    
    if (existing) {
      // Tăng +1
      await db.query(
        `UPDATE student_hand_raises 
         SET total_hand_raises = total_hand_raises + 1, updated_at = NOW()
         WHERE classroom_id = ? AND student_id = ?`,
        [classroomId, studentId]
      );
      return existing.id;
    } else {
      // Tạo mới với 1 lần
      return await this.create({ classroom_id: classroomId, student_id: studentId, total_hand_raises: 1 });
    }
  }

  // Cập nhật tổng số lần giơ tay (cho trường hợp sửa thủ công)
  static async updateTotal(classroomId, studentId, total_hand_raises) {
    const existing = await this.findOne(classroomId, studentId);
    
    if (existing) {
      await db.query(
        `UPDATE student_hand_raises 
         SET total_hand_raises = ?, updated_at = NOW()
         WHERE classroom_id = ? AND student_id = ?`,
        [total_hand_raises, classroomId, studentId]
      );
      return existing.id;
    } else {
      // Tạo mới
      return await this.create({ classroom_id: classroomId, student_id: studentId, total_hand_raises });
    }
  }

  // Lấy tất cả học sinh trong lớp với dữ liệu giơ tay
  static async findByClassroom(classroomId) {
    const [rows] = await db.query(
      `SELECT 
        s.id as student_id,
        s.student_code,
        s.full_name,
        COALESCE(shr.total_hand_raises, 0) as total_hand_raises,
        shr.created_at as first_raise_date,
        shr.updated_at as last_raise_date
       FROM classroom_students cs
       JOIN students s ON cs.student_id = s.id
       LEFT JOIN student_hand_raises shr 
         ON s.id = shr.student_id AND shr.classroom_id = ?
       WHERE cs.classroom_id = ? AND cs.status = 'active'
       ORDER BY s.full_name ASC`,
      [classroomId, classroomId]
    );
    return rows;
  }

  // Tính toán thống kê giơ tay (với avg per week dựa vào created_at)
  static async getStatistics(classroomId, studentId) {
    const record = await this.findOne(classroomId, studentId);
    
    if (!record) {
      return {
        total_hand_raises: 0,
        avg_hand_raises_per_week: 0,
        first_raise_date: null,
        last_raise_date: null,
        weeks_tracked: 0
      };
    }

    // Tính số tuần từ lần đầu giơ tay đến giờ
    const startDate = new Date(record.created_at);
    const now = new Date();
    const diffMs = now - startDate;
    const diffWeeks = Math.max(diffMs / (7 * 24 * 60 * 60 * 1000), 0.1); // Tối thiểu 0.1 tuần để tránh chia 0
    
    return {
      total_hand_raises: record.total_hand_raises || 0,
      avg_hand_raises_per_week: (record.total_hand_raises || 0) / diffWeeks,
      first_raise_date: record.created_at,
      last_raise_date: record.updated_at,
      weeks_tracked: Math.ceil(diffWeeks)
    };
  }

  // Xóa record
  static async delete(classroomId, studentId) {
    await db.query(
      'DELETE FROM student_hand_raises WHERE classroom_id = ? AND student_id = ?',
      [classroomId, studentId]
    );
  }

  // Reset về 0
  static async reset(classroomId, studentId) {
    await db.query(
      `UPDATE student_hand_raises 
       SET total_hand_raises = 0, updated_at = NOW()
       WHERE classroom_id = ? AND student_id = ?`,
      [classroomId, studentId]
    );
  }
}

module.exports = StudentHandRaise;
