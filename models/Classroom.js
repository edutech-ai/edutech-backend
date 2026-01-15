const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class Classroom {
  // Tạo lớp học mới
  static async create({ teacher_id, name, school_year, description, avatar_url, status = 'active' }) {
    const classroomId = uuidv7();
    
    await db.query(
      `INSERT INTO classrooms (id, teacher_id, name, school_year, description, avatar_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [classroomId, teacher_id, name, school_year, description, avatar_url, status]
    );
    
    return classroomId;
  }

  // Tìm lớp học theo ID
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM classrooms WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Tìm lớp học theo teacher_id
  static async findByTeacherId(teacherId, filters = {}) {
    let query = 'SELECT * FROM classrooms WHERE teacher_id = ?';
    const params = [teacherId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Đếm số lớp học của giáo viên
  static async countByTeacherId(teacherId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM classrooms WHERE teacher_id = ?';
    const params = [teacherId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count;
  }

  // Cập nhật lớp học
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.school_year !== undefined) {
      fields.push('school_year = ?');
      values.push(data.school_year);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(data.avatar_url);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.query(
      `UPDATE classrooms SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Xóa lớp học
  static async delete(id) {
    await db.query('DELETE FROM classrooms WHERE id = ?', [id]);
  }

  // Đếm số học sinh trong lớp
  static async countStudents(classroomId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM classroom_students WHERE classroom_id = ? AND status = "active"',
      [classroomId]
    );
    return rows[0].count;
  }
}

module.exports = Classroom;
