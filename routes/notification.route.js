const express = require('express');
const NotificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Quản lý thông báo
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Chỉ lấy thông báo chưa đọc (1 = yes)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "019c478a-74e1-735a-980c-79396a22ace5"
 *                       category:
 *                         type: string
 *                         example: "account"
 *                       title:
 *                         type: string
 *                         example: "Chào mừng thầy cô đã gia nhập EduTech!"
 *                       message:
 *                         type: string
 *                         example: "Tài khoản đã được tạo thành công."
 *                       url:
 *                         type: string
 *                         nullable: true
 *                         example: "/profile"
 *                       is_read:
 *                         type: boolean
 *                         example: false
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-19T10:00:00.000Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     per_page:
 *                       type: integer
 *                       example: 10
 *                     last_page:
 *                       type: integer
 *                       example: 5
 *                     total:
 *                       type: integer
 *                       example: 50
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', authenticate, NotificationController.getNotifications);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Lấy số lượng thông báo chưa đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Số lượng thông báo chưa đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     unread_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   post:
 *     summary: Đánh dấu thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông báo
 *     responses:
 *       200:
 *         description: Đã đánh dấu đã đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đã đọc thông báo"
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông báo
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/:id/read', authenticate, NotificationController.markAsRead);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   post:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã đánh dấu tất cả thông báo là đã đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đã đánh dấu tất cả thông báo là đã đọc"
 *                 updated_count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/read-all', authenticate, NotificationController.markAllAsRead);

module.exports = router;
