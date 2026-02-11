const db = require('../config/database');
const { v7: uuidv7 } = require('uuid');

class Notification {
    // Tạo thông báo mới
    static async create({ user_id, type, title, message, url = null }) {
        const notificationId = uuidv7();

        await db.query(
            `INSERT INTO notifications (id, user_id, type, title, message, url, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
            [notificationId, user_id, type, title, message, url]
        );

        return notificationId;
    }

    // Lấy danh sách thông báo của user
    static async findByUserId(userId, filters = {}) {
        let query = `SELECT * FROM notifications WHERE user_id = ?`;
        const params = [userId];

        // Filter by unread
        if (filters.unread === '1' || filters.unread === 1) {
            query += ` AND is_read = FALSE`;
        }

        query += ` ORDER BY created_at DESC`;

        // Pagination
        if (filters.per_page) {
            const perPage = parseInt(filters.per_page);
            const page = parseInt(filters.page || 1);
            const offset = (page - 1) * perPage;
            query += ` LIMIT ? OFFSET ?`;
            params.push(perPage, offset);
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Đếm tổng số thông báo
    static async countByUserId(userId, filters = {}) {
        let query = `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`;
        const params = [userId];

        if (filters.unread === '1' || filters.unread === 1) {
            query += ` AND is_read = FALSE`;
        }

        const [rows] = await db.query(query, params);
        return rows[0].total;
    }

    // Tìm thông báo theo ID
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM notifications WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    // Đánh dấu đã đọc
    static async markAsRead(id, userId) {
        await db.query(
            `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
    }

    // Đánh dấu tất cả đã đọc
    static async markAllAsRead(userId) {
        const [result] = await db.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );
        return result.affectedRows;
    }

    // Xóa thông báo
    static async delete(id, userId) {
        await db.query(
            `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
    }

    // Đếm số thông báo chưa đọc
    static async countUnread(userId) {
        const [rows] = await db.query(
            `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = Notification;
