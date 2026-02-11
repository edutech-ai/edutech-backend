const Notification = require('../models/Notification');

class NotificationController {
    // Lấy danh sách thông báo
    static async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { unread, page = 1, per_page = 10 } = req.query;

            const filters = {
                unread,
                page,
                per_page
            };

            const notifications = await Notification.findByUserId(userId, filters);
            const total = await Notification.countByUserId(userId, filters);

            const perPage = parseInt(per_page);
            const currentPage = parseInt(page);

            res.json({
                status: true,
                data: notifications.map(n => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    url: n.url,
                    is_read: Boolean(n.is_read),
                    created_at: n.created_at
                })),
                pagination: {
                    current_page: currentPage,
                    per_page: perPage,
                    last_page: Math.ceil(total / perPage),
                    total: total
                }
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                status: false,
                message: 'Không thể lấy danh sách thông báo',
                error: error.message
            });
        }
    }

    // Đánh dấu thông báo đã đọc
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const notification = await Notification.findById(id);

            if (!notification) {
                return res.status(404).json({
                    status: false,
                    message: 'Không tìm thấy thông báo'
                });
            }

            // Kiểm tra quyền sở hữu
            if (notification.user_id !== userId) {
                return res.status(403).json({
                    status: false,
                    message: 'Bạn không có quyền truy cập thông báo này'
                });
            }

            await Notification.markAsRead(id, userId);

            res.json({
                status: true,
                message: 'Đã đọc thông báo'
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                status: false,
                message: 'Không thể đánh dấu đã đọc',
                error: error.message
            });
        }
    }

    // Đánh dấu tất cả thông báo đã đọc
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;

            const updatedCount = await Notification.markAllAsRead(userId);

            res.json({
                status: true,
                message: 'Đã đánh dấu tất cả thông báo là đã đọc',
                updated_count: updatedCount
            });
        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({
                status: false,
                message: 'Không thể đánh dấu tất cả đã đọc',
                error: error.message
            });
        }
    }

    // Lấy số lượng thông báo chưa đọc
    static async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const count = await Notification.countUnread(userId);

            res.json({
                status: true,
                data: {
                    unread_count: count
                }
            });
        } catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({
                status: false,
                message: 'Không thể lấy số thông báo chưa đọc',
                error: error.message
            });
        }
    }
}

module.exports = NotificationController;
