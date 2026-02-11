const express = require('express');
const ProfileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth');
const { profileValidation } = require('../middlewares/profile.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User Profile Management APIs
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Lấy profile của user hiện tại
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                     date_of_birth:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                     address:
 *                       type: string
 *                     email_notification:
 *                       type: boolean
 *                     push_notification:
 *                       type: boolean
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Profile not found
 */
router.get('/', authenticate, ProfileController.getMyProfile);

/**
 * @swagger
 * /api/v1/profile/stats:
 *   get:
 *     summary: Lấy thống kê của giáo viên (Teacher only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_quizzes:
 *                       type: integer
 *                       example: 24
 *                       description: Tổng số đề thi
 *                     total_matrices:
 *                       type: integer
 *                       example: 18
 *                       description: Tổng số ma trận đề thi
 *                     total_students:
 *                       type: integer
 *                       example: 120
 *                       description: Tổng số học sinh
 *                     total_classrooms:
 *                       type: integer
 *                       example: 2
 *                       description: Tổng số lớp học
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ dành cho giáo viên)
 */
router.get('/stats', authenticate, ProfileController.getTeacherStats);

/**
 * @swagger
 * /api/v1/profile/recent-activities:
 *   get:
 *     summary: Lấy hoạt động gần đây của giáo viên (Teacher only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy hoạt động gần đây thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [quiz_created, matrix_created, grading_completed]
 *                         example: quiz_created
 *                       title:
 *                         type: string
 *                         example: Tạo đề kiểm tra mới
 *                       description:
 *                         type: string
 *                         example: Đề kiểm tra 15 phút - Phương trình bậc nhất
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-01-15T17:30:00.000Z
 *                       metadata:
 *                         type: object
 *                         properties:
 *                           quiz_id:
 *                             type: string
 *                           matrix_id:
 *                             type: string
 *                           student_count:
 *                             type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập (chỉ dành cho giáo viên)
 */
router.get('/recent-activities', authenticate, ProfileController.getRecentActivities);

/**
 * @swagger
 * /api/v1/profile:
 *   post:
 *     summary: Tạo profile mới (nếu chưa có)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               gender:
 *                 type: string
 *                 example: "Nam"
 *               avatar_url:
 *                 type: string
 *                 example: "https://example.com/avatar.jpg"
 *               address:
 *                 type: string
 *                 example: "Ha Noi, Viet Nam"
 *               email_notification:
 *                 type: boolean
 *                 default: true
 *               push_notification:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Tạo profile thành công
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
 *       409:
 *         description: Profile đã tồn tại
 */
router.post('/', authenticate, profileValidation, ProfileController.createProfile);

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     summary: Cập nhật profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nguyen Van A"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               gender:
 *                 type: string
 *                 example: "Nam"
 *               avatar_url:
 *                 type: string
 *                 example: "https://res.cloudinary.com/example/image/upload/avatar.jpg"
 *               address:
 *                 type: string
 *                 example: "Ho Chi Minh City, Viet Nam"
 *               email_notification:
 *                 type: boolean
 *                 example: true
 *               push_notification:
 *                 type: boolean
 *                 example: true
 *               subject:
 *                 type: string
 *                 enum: [TOAN, VAN, ANH, LY, HOA, SINH, SU, DIA, GDCD, TIN, CN]
 *                 example: "TOAN"
 *                 description: Môn dạy (chỉ dành cho TEACHER)
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Profile không tồn tại
 */
router.put('/', authenticate, ProfileController.updateProfile);

/**
 * @swagger
 * /api/v1/profile:
 *   delete:
 *     summary: Xóa profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Profile không tồn tại
 */
router.delete('/', authenticate, ProfileController.deleteProfile);

/**
 * @swagger
 * /api/v1/profile/{userId}:
 *   get:
 *     summary: Lấy profile của user khác (public)
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Lấy profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                     date_of_birth:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                     address:
 *                       type: string
 *       404:
 *         description: User không tồn tại
 */
router.get('/:userId', ProfileController.getProfileById);

module.exports = router;
