const db = require('../config/database');

class BugReport {
  static async create({ user_id, title, description, attachments = [] }) {
    const query = `
      INSERT INTO bug_reports (user_id, title, description, attachments)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      user_id,
      title,
      description,
      JSON.stringify(attachments),
    ]);
    return this.findById(result.insertId, user_id);
  }

  static async findById(id, requestUserId = null) {
    const query = `
      SELECT br.*, p.name as author_name, p.avatar_url
      FROM bug_reports br
      JOIN users u ON br.user_id = u.id
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE br.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    if (rows.length === 0) return null;
    return this._format(rows[0], requestUserId);
  }

  static async findAll({ status = null, user_id = null, requestUserId = null, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '1=1';

    if (status) {
      where += ' AND br.status = ?';
      params.push(status);
    }
    if (user_id) {
      where += ' AND br.user_id = ?';
      params.push(user_id);
    }

    const query = `
      SELECT br.*, p.name as author_name, p.avatar_url
      FROM bug_reports br
      JOIN users u ON br.user_id = u.id
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE ${where}
      ORDER BY br.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const [rows] = await db.execute(query, params);

    const countQuery = `SELECT COUNT(*) as total FROM bug_reports br WHERE ${where}`;
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;

    return {
      data: rows.map((r) => this._format(r, requestUserId)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async updateStatus(id, status) {
    const query = `UPDATE bug_reports SET status = ? WHERE id = ?`;
    await db.execute(query, [status, id]);
    return this.findById(id);
  }

  static _format(row, requestUserId) {
    return {
      ...row,
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      is_own: requestUserId ? row.user_id === requestUserId : false,
    };
  }
}

module.exports = BugReport;
