const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v7: uuidv7 } = require('uuid');

class User {
  // Tạo user mới
  static async create({ email, password, role = 'TEACHER', subject = null }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv7();
    
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

  // Đổi password
  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users SET password_hash = ? WHERE id = ? AND is_deleted = FALSE`,
      [hashedPassword, id]
    );
  }

  // Tạo reset password token (simple version - lưu vào DB thực tế nên có bảng riêng)
  static async createPasswordResetToken(email) {
    const user = await this.findByEmail(email);
    if (!user) return null;

    // Generate random token (trong thực tế nên lưu vào bảng password_reset_tokens)
    const resetToken = uuidv7();
    const expires = new Date(Date.now() + 3600000); // 1 giờ

    // Ở đây đơn giản hóa - trong thực tế nên có bảng riêng
    // Trả về token để gửi email
    return {
      userId: user.id,
      resetToken,
      expires
    };
  }
}

module.exports = User;
