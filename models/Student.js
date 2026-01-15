const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class Student {
  // Tạo học sinh mới
  static async create({ full_name, student_code, phone_number, parent_phone_number, is_active = true }) {
    const studentId = uuidv7();
    
    await db.query(
      `INSERT INTO students (id, full_name, student_code, phone_number, parent_phone_number, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, full_name, student_code, phone_number, parent_phone_number, is_active]
    );
    
    return studentId;
  }

  // Tìm học sinh theo ID
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM students WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Tìm học sinh theo student_code
  static async findByStudentCode(studentCode) {
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_code = ?',
      [studentCode]
    );
    return rows[0];
  }

  // Lấy danh sách học sinh với tìm kiếm
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (filters.search) {
      query += ' AND (full_name LIKE ? OR student_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY full_name ASC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Đếm tổng số học sinh
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM students WHERE 1=1';
    const params = [];

    if (filters.search) {
      query += ' AND (full_name LIKE ? OR student_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count;
  }

  // Cập nhật học sinh
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.full_name !== undefined) {
      fields.push('full_name = ?');
      values.push(data.full_name);
    }
    if (data.student_code !== undefined) {
      fields.push('student_code = ?');
      values.push(data.student_code);
    }
    if (data.phone_number !== undefined) {
      fields.push('phone_number = ?');
      values.push(data.phone_number);
    }
    if (data.parent_phone_number !== undefined) {
      fields.push('parent_phone_number = ?');
      values.push(data.parent_phone_number);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Xóa học sinh
  static async delete(id) {
    await db.query('DELETE FROM students WHERE id = ?', [id]);
  }
}

module.exports = Student;
