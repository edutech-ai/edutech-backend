const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authenticateOptional, authorizeAdmin } = require('../middlewares/auth');
const ReportController = require('../controllers/report.controller');

const bugReportValidation = [
  body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống').isLength({ max: 100 }).withMessage('Tiêu đề tối đa 100 ký tự'),
  body('description').trim().notEmpty().withMessage('Mô tả không được để trống').isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
];

const featureRequestValidation = [
  body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống').isLength({ max: 100 }).withMessage('Tiêu đề tối đa 100 ký tự'),
  body('description').trim().notEmpty().withMessage('Mô tả không được để trống').isLength({ max: 500 }).withMessage('Mô tả tối đa 500 ký tự'),
];

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Bug reports and feature requests management APIs
 */

// ─── Bug Reports ─────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/reports/bugs:
 *   get:
 *     summary: Lấy danh sách báo cáo lỗi
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, fixed]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: mine
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Chỉ lấy báo cáo của tôi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách báo cáo lỗi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user_id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, confirmed, fixed]
 *                       attachments:
 *                         type: array
 *                         items:
 *                           type: string
 *                       author_name:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                       is_own:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Lỗi server
 */
router.get('/bugs', authenticateOptional, ReportController.getBugReports);

/**
 * @swagger
 * /api/v1/reports/bugs:
 *   post:
 *     summary: Tạo báo cáo lỗi mới
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 example: Lỗi không thể tải danh sách quiz
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: Khi tôi click vào tab "My Quizzes", trang bị treo và không hiển thị gì cả
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Tối đa 5 file (ảnh JPG/PNG/WEBP hoặc video MP4/MOV), mỗi file tối đa 20MB
 *     responses:
 *       201:
 *         description: Báo cáo lỗi đã được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post('/bugs', authenticate, bugReportValidation, ReportController.createBugReport);

/**
 * @swagger
 * /api/v1/reports/bugs/{id}:
 *   put:
 *     summary: Cập nhật báo cáo lỗi (chỉ chủ sở hữu)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của báo cáo lỗi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền chỉnh sửa
 *       404:
 *         description: Không tìm thấy báo cáo
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xoá báo cáo lỗi (chỉ chủ sở hữu)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của báo cáo lỗi
 *     responses:
 *       200:
 *         description: Xoá thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền xoá
 *       404:
 *         description: Không tìm thấy báo cáo
 *       500:
 *         description: Lỗi server
 */
router.put('/bugs/:id', authenticate, bugReportValidation, ReportController.updateBugReport);
router.delete('/bugs/:id', authenticate, ReportController.deleteBugReport);

// ─── Feature Requests ────────────────────────────────────────

/**
 * @swagger
 * /api/v1/reports/features:
 *   get:
 *     summary: Lấy danh sách đề xuất tính năng
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, under_review, planned, completed, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: mine
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Chỉ lấy đề xuất của tôi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách đề xuất tính năng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user_id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, under_review, planned, completed, rejected]
 *                       like_count:
 *                         type: integer
 *                       author_name:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                       is_own:
 *                         type: boolean
 *                       is_liked:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Lỗi server
 */
router.get('/features', authenticateOptional, ReportController.getFeatureRequests);

/**
 * @swagger
 * /api/v1/reports/features:
 *   post:
 *     summary: Tạo đề xuất tính năng mới
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 example: Thêm tính năng xuất báo cáo PDF
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Cho phép giáo viên xuất kết quả thi của học sinh ra file PDF để in hoặc lưu trữ
 *     responses:
 *       201:
 *         description: Đề xuất đã được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post('/features', authenticate, featureRequestValidation, ReportController.createFeatureRequest);

/**
 * @swagger
 * /api/v1/reports/features/{id}:
 *   put:
 *     summary: Cập nhật đề xuất tính năng (chỉ chủ sở hữu)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của đề xuất tính năng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền chỉnh sửa
 *       404:
 *         description: Không tìm thấy đề xuất
 *       500:
 *         description: Lỗi server
 *   delete:
 *     summary: Xoá đề xuất tính năng (chỉ chủ sở hữu)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của đề xuất tính năng
 *     responses:
 *       200:
 *         description: Xoá thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền xoá
 *       404:
 *         description: Không tìm thấy đề xuất
 *       500:
 *         description: Lỗi server
 */
router.put('/features/:id', authenticate, featureRequestValidation, ReportController.updateFeatureRequest);
router.delete('/features/:id', authenticate, ReportController.deleteFeatureRequest);

/**
 * @swagger
 * /api/v1/reports/features/{id}/like:
 *   post:
 *     summary: Thích/Bỏ thích đề xuất tính năng
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của đề xuất tính năng
 *     responses:
 *       200:
 *         description: Thao tác thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 action:
 *                   type: string
 *                   enum: [liked, unliked]
 *                 data:
 *                   type: object
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post('/features/:id/like', authenticate, ReportController.toggleLike);

// ─── Admin Status Updates ─────────────────────────────────────
router.patch('/bugs/:id/status', authenticate, authorizeAdmin, ReportController.updateBugStatus);
router.patch('/features/:id/status', authenticate, authorizeAdmin, ReportController.updateFeatureStatus);

module.exports = router;
