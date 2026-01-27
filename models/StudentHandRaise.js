const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class StudentHandRaise {
  // Tạo hoặc cập nhật giơ tay
  static async upsert({ classroom_id, student_id, week_start_date, raise_count, notes }) {
    const existing = await this.findByWeek(classroom_id, student_id, week_start_date);
    
    if (existing) {
      // Update
      await db.query(
        `UPDATE student_hand_raises 
         SET raise_count = ?, notes = ?, updated_at = NOW()
         WHERE classroom_id = ? AND student_id = ? AND week_start_date = ?`,
        [raise_count, notes, classroom_id, student_id, week_start_date]
      );
      return existing.id;
    } else {
      // Create
      const handRaiseId = uuidv7();
      await db.query(
        `INSERT INTO student_hand_raises 
         (id, classroom_id, student_id, week_start_date, raise_count, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [handRaiseId, classroom_id, student_id, week_start_date, raise_count, notes]
      );
      return handRaiseId;
    }
  }

  // Tìm theo tuần
  static async findByWeek(classroomId, studentId, weekStartDate) {
    const [rows] = await db.query(
      `SELECT * FROM student_hand_raises 
       WHERE classroom_id = ? AND student_id = ? AND week_start_date = ?`,
      [classroomId, studentId, weekStartDate]
    );
    return rows[0];
  }

  // Lấy tất cả giơ tay của học sinh trong lớp
  static async findByClassroomStudent(classroomId, studentId, filters = {}) {
    let query = `
      SELECT * FROM student_hand_raises 
      WHERE classroom_id = ? AND student_id = ?
    `;
    const params = [classroomId, studentId];

    if (filters.from_date) {
      query += ' AND week_start_date >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND week_start_date <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY week_start_date DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Lấy giơ tay của tất cả học sinh trong 1 tuần
  static async findByClassroomWeek(classroomId, weekStartDate) {
    const [rows] = await db.query(
      `SELECT shr.*, s.full_name, s.student_code
       FROM student_hand_raises shr
       JOIN students s ON shr.student_id = s.id
       WHERE shr.classroom_id = ? AND shr.week_start_date = ?
       ORDER BY s.full_name ASC`,
      [classroomId, weekStartDate]
    );
    return rows;
  }

  // Lấy tất cả học sinh trong lớp với dữ liệu giơ tay của tuần (nếu có)
  static async findAllStudentsWithWeekData(classroomId, weekStartDate) {
    const [rows] = await db.query(
      `SELECT 
        s.id as student_id,
        s.student_code,
        s.full_name,
        COALESCE(shr.raise_count, 0) as raise_count,
        shr.notes,
        shr.id as hand_raise_id
       FROM classroom_students cs
       JOIN students s ON cs.student_id = s.id
       LEFT JOIN student_hand_raises shr ON s.id = shr.student_id 
         AND shr.classroom_id = ? 
         AND shr.week_start_date = ?
       WHERE cs.classroom_id = ? AND cs.status = 'active'
       ORDER BY s.full_name ASC`,
      [classroomId, weekStartDate, classroomId]
    );
    return rows;
  }

  // Tính toán thống kê giơ tay
  static async getStatistics(classroomId, studentId) {
    const [rows] = await db.query(
      `SELECT 
        COUNT(*) as total_weeks_tracked,
        SUM(raise_count) as total_hand_raises,
        AVG(raise_count) as avg_hand_raises_per_week
       FROM student_hand_raises 
       WHERE classroom_id = ? AND student_id = ?`,
      [classroomId, studentId]
    );
    return rows[0];
  }

  // Xóa record
  static async delete(classroomId, studentId, weekStartDate) {
    await db.query(
      'DELETE FROM student_hand_raises WHERE classroom_id = ? AND student_id = ? AND week_start_date = ?',
      [classroomId, studentId, weekStartDate]
    );
  }

  // Batch upsert nhiều học sinh
  static async batchUpsert(classroomId, weekStartDate, students) {
    const results = [];
    for (const student of students) {
      const id = await this.upsert({
        classroom_id: classroomId,
        student_id: student.student_id,
        week_start_date: weekStartDate,
        raise_count: student.raise_count,
        notes: student.notes
      });
      results.push({ student_id: student.student_id, id });
    }
    return results;
  }
}

module.exports = StudentHandRaise;
