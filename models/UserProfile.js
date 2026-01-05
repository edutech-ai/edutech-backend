const db = require('../config/database');

class UserProfile {
  // Tạo profile mới
  static async create(userId, profileData = {}) {
    const { name, date_of_birth, gender, avatar_url, address, email_notification, push_notification } = profileData;
    
    await db.query(
      `INSERT INTO user_profiles (user_id, name, date_of_birth, gender, avatar_url, address, email_notification, push_notification) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name || null,
        date_of_birth || null,
        gender || null,
        avatar_url || null,
        address || null,
        email_notification !== undefined ? email_notification : true,
        push_notification !== undefined ? push_notification : true
      ]
    );
    
    return this.findByUserId(userId);
  }

  // Tìm profile theo user_id
  static async findByUserId(userId) {
    const [rows] = await db.query(
      `SELECT * FROM user_profiles WHERE user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  // Tìm profile đầy đủ (join với users)
  static async findFullProfileByUserId(userId) {
    const [rows] = await db.query(
      `SELECT 
        u.id, u.email, u.role, u.subject, u.status, u.created_at,
        p.name, p.date_of_birth, p.gender, p.avatar_url, p.address, 
        p.email_notification, p.push_notification
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = ? AND u.is_deleted = FALSE`,
      [userId]
    );
    return rows[0];
  }

  // Cập nhật profile
  static async update(userId, profileData) {
    const fields = [];
    const values = [];

    if (profileData.name !== undefined) {
      fields.push('name = ?');
      values.push(profileData.name);
    }
    if (profileData.date_of_birth !== undefined) {
      fields.push('date_of_birth = ?');
      values.push(profileData.date_of_birth);
    }
    if (profileData.gender !== undefined) {
      fields.push('gender = ?');
      values.push(profileData.gender);
    }
    if (profileData.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(profileData.avatar_url);
    }
    if (profileData.address !== undefined) {
      fields.push('address = ?');
      values.push(profileData.address);
    }
    if (profileData.email_notification !== undefined) {
      fields.push('email_notification = ?');
      values.push(profileData.email_notification);
    }
    if (profileData.push_notification !== undefined) {
      fields.push('push_notification = ?');
      values.push(profileData.push_notification);
    }

    if (fields.length === 0) return;

    values.push(userId);
    
    await db.query(
      `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );

    return this.findByUserId(userId);
  }

  // Xóa profile
  static async delete(userId) {
    await db.query(
      `DELETE FROM user_profiles WHERE user_id = ?`,
      [userId]
    );
  }
}

module.exports = UserProfile;
