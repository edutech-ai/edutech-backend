const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  // Tạo user mới
  static async create({ email, password, role = 'TEACHER', subject = null }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, subject) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, role, subject]
    );
    
    return userId;
  }

  // Tìm user theo email
  static async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT * FROM users WHERE email = ? AND is_deleted = FALSE`,
      [email]
    );
    return rows[0];
  }

  // Tìm user theo ID
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT id, email, role, subject, status, created_at 
       FROM users WHERE id = ? AND is_deleted = FALSE`,
      [id]
    );
    return rows[0];
  }

  // Kiểm tra password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Cập nhật user
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.email) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.role) {
      fields.push('role = ?');
      values.push(data.role);
    }
    if (data.subject) {
      fields.push('subject = ?');
      values.push(data.subject);
    }
    if (data.status) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return;

    values.push(id);
    
    await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND is_deleted = FALSE`,
      values
    );
  }

  // Soft delete user
  static async delete(id) {
    await db.query(
      `UPDATE users SET is_deleted = TRUE WHERE id = ?`,
      [id]
    );
  }
}

module.exports = User;
