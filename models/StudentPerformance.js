const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class StudentPerformance {
  // Tạo hoặc cập nhật performance
  static async upsert({ 
    classroom_id, 
    student_id, 
    total_exams, 
    average_score, 
    highest_score,
    lowest_score,
    total_weeks_tracked,
    total_hand_raises,
    avg_hand_raises_per_week,
    performance_level,
    system_evaluation,
    teacher_notes
  }) {
    const existing = await this.findOne(classroom_id, student_id);
    
    if (existing) {
      // Update
      return await this.update(classroom_id, student_id, {
        total_exams,
        average_score,
        highest_score,
        lowest_score,
        total_weeks_tracked,
        total_hand_raises,
        avg_hand_raises_per_week,
        performance_level,
        system_evaluation,
        teacher_notes
      });
    } else {
      // Create
      const performanceId = uuidv7();
      await db.query(
        `INSERT INTO student_performance 
         (id, classroom_id, student_id, total_exams, average_score, highest_score, lowest_score,
          total_weeks_tracked, total_hand_raises, avg_hand_raises_per_week, 
          performance_level, system_evaluation, teacher_notes, last_calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          performanceId,
          classroom_id,
          student_id,
          total_exams || 0,
          average_score,
          highest_score,
          lowest_score,
          total_weeks_tracked || 0,
          total_hand_raises || 0,
          avg_hand_raises_per_week || 0,
          performance_level,
          system_evaluation,
          teacher_notes
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
    if (data.highest_score !== undefined) {
      fields.push('highest_score = ?');
      values.push(data.highest_score);
    }
    if (data.lowest_score !== undefined) {
      fields.push('lowest_score = ?');
      values.push(data.lowest_score);
    }
    if (data.total_weeks_tracked !== undefined) {
      fields.push('total_weeks_tracked = ?');
      values.push(data.total_weeks_tracked);
    }
    if (data.total_hand_raises !== undefined) {
      fields.push('total_hand_raises = ?');
      values.push(data.total_hand_raises);
    }
    if (data.avg_hand_raises_per_week !== undefined) {
      fields.push('avg_hand_raises_per_week = ?');
      values.push(data.avg_hand_raises_per_week);
    }
    if (data.performance_level !== undefined) {
      fields.push('performance_level = ?');
      values.push(data.performance_level);
    }
    if (data.system_evaluation !== undefined) {
      fields.push('system_evaluation = ?');
      values.push(data.system_evaluation);
    }
    if (data.teacher_notes !== undefined) {
      fields.push('teacher_notes = ?');
      values.push(data.teacher_notes);
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

  // Lấy bảng xếp hạng lớp (theo điểm)
  static async getLeaderboard(classroomId, orderBy = 'score', limit = 20) {
    let orderByClause = 'sp.average_score DESC';
    
    if (orderBy === 'participation') {
      orderByClause = 'sp.avg_hand_raises_per_week DESC';
    } else if (orderBy === 'overall') {
      orderByClause = `
        CASE sp.performance_level
          WHEN 'excellent' THEN 5
          WHEN 'good' THEN 4
          WHEN 'average' THEN 3
          WHEN 'needs_improvement' THEN 2
          WHEN 'at_risk' THEN 1
          ELSE 0
        END DESC, sp.average_score DESC
      `;
    }

    const [rows] = await db.query(
      `SELECT sp.*, s.full_name, s.student_code
       FROM student_performance sp
       JOIN students s ON sp.student_id = s.id
       WHERE sp.classroom_id = ?
       ORDER BY ${orderByClause}
       LIMIT ?`,
      [classroomId, limit]
    );

    return rows;
  }

  // Lấy tất cả performance của lớp
  static async findByClassroom(classroomId) {
    const [rows] = await db.query(
      `SELECT sp.*, s.full_name, s.student_code
       FROM student_performance sp
       JOIN students s ON sp.student_id = s.id
       WHERE sp.classroom_id = ?
       ORDER BY s.full_name ASC`,
      [classroomId]
    );

    return rows;
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
