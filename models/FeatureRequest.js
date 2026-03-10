const db = require('../config/database');

class FeatureRequest {
  static async create({ user_id, title, description }) {
    const query = `
      INSERT INTO feature_requests (user_id, title, description)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(query, [user_id, title, description]);
    return this.findById(result.insertId, user_id);
  }

  static async findById(id, requestUserId = null) {
    const query = `
      SELECT fr.*, p.name as author_name, p.avatar_url
      FROM feature_requests fr
      JOIN users u ON fr.user_id = u.id
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE fr.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    if (rows.length === 0) return null;
    return this._formatWithLike(rows[0], requestUserId);
  }

  static async findAll({ status = null, user_id = null, requestUserId = null, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '1=1';

    if (status) {
      where += ' AND fr.status = ?';
      params.push(status);
    }
    if (user_id) {
      where += ' AND fr.user_id = ?';
      params.push(user_id);
    }

    const query = `
      SELECT fr.*, p.name as author_name, p.avatar_url
      FROM feature_requests fr
      JOIN users u ON fr.user_id = u.id
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE ${where}
      ORDER BY fr.likes_count DESC, fr.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const [rows] = await db.execute(query, params);

    const countQuery = `SELECT COUNT(*) as total FROM feature_requests fr WHERE ${where}`;
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;

    const formatted = await Promise.all(
      rows.map((r) => this._formatWithLike(r, requestUserId))
    );

    return {
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async toggleLike(featureRequestId, userId) {
    const checkQuery = `SELECT id FROM feature_request_likes WHERE feature_request_id = ? AND user_id = ?`;
    const [existing] = await db.execute(checkQuery, [featureRequestId, userId]);

    if (existing.length > 0) {
      await db.execute(`DELETE FROM feature_request_likes WHERE feature_request_id = ? AND user_id = ?`, [featureRequestId, userId]);
      await db.execute(`UPDATE feature_requests SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?`, [featureRequestId]);
      return { liked: false };
    } else {
      await db.execute(`INSERT INTO feature_request_likes (feature_request_id, user_id) VALUES (?, ?)`, [featureRequestId, userId]);
      await db.execute(`UPDATE feature_requests SET likes_count = likes_count + 1 WHERE id = ?`, [featureRequestId]);
      return { liked: true };
    }
  }

  static async updateStatus(id, status) {
    const query = `UPDATE feature_requests SET status = ? WHERE id = ?`;
    await db.execute(query, [status, id]);
    return this.findById(id);
  }

  static async _formatWithLike(row, requestUserId) {
    let liked = false;
    if (requestUserId) {
      const [rows] = await db.execute(
        `SELECT id FROM feature_request_likes WHERE feature_request_id = ? AND user_id = ?`,
        [row.id, requestUserId]
      );
      liked = rows.length > 0;
    }
    return {
      ...row,
      liked,
      is_own: requestUserId ? row.user_id === requestUserId : false,
    };
  }
}

module.exports = FeatureRequest;
