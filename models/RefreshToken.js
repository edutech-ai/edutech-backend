const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');
const crypto = require('crypto');

class RefreshToken {
  // Tạo refresh token mới
  static async create(userId, token) {
    const tokenId = uuidv7();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, is_revoked) 
       VALUES (?, ?, ?, ?, FALSE)`,
      [tokenId, userId, token, expiresAt]
    );

    return {
      id: tokenId,
      token,
      expiresAt
    };
  }

  // Tìm refresh token
  static async findByToken(token) {
    const [rows] = await db.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? AND is_revoked = FALSE AND expires_at > NOW()`,
      [token]
    );
    return rows[0];
  }

  // Revoke (vô hiệu hóa) refresh token
  static async revoke(token) {
    await db.query(
      `UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = ?`,
      [token]
    );
  }

  // Revoke tất cả tokens của user (dùng khi logout all devices)
  static async revokeAllByUserId(userId) {
    await db.query(
      `UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = ?`,
      [userId]
    );
  }

  // Xóa tokens đã hết hạn (chạy định kỳ)
  static async cleanExpired() {
    await db.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
    );
  }

  // Đếm số refresh tokens active của user
  static async countActiveTokens(userId) {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM refresh_tokens 
       WHERE user_id = ? AND is_revoked = FALSE AND expires_at > NOW()`,
      [userId]
    );
    return rows[0].count;
  }
}

module.exports = RefreshToken;
