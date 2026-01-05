const express = require('express');
const ProfileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth');
const { profileValidation } = require('../middlewares/profile.validator');
const { uploadAvatar, handleMulterError } = require('../middlewares/upload');

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
 *     summary: Cập nhật profile (hỗ trợ cả JSON và multipart/form-data)
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
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               gender:
 *                 type: string
 *                 example: "Nữ"
 *               avatar_url:
 *                 type: string
 *                 example: "https://example.com/avatar.jpg"
 *               address:
 *                 type: string
 *                 example: "Ho Chi Minh City, Viet Nam"
 *               email_notification:
 *                 type: boolean
 *               push_notification:
 *                 type: boolean
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: "Avatar file (max 2MB, jpg/png/gif/webp)"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               gender:
 *                 type: string
 *                 example: "Nữ"
 *               address:
 *                 type: string
 *                 example: "Ho Chi Minh City, Viet Nam"
 *               email_notification:
 *                 type: boolean
 *               push_notification:
 *                 type: boolean
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar_url:
 *                       type: string
 *                       description: Cloudinary URL nếu upload file
 *       404:
 *         description: Profile không tồn tại
 */
router.put('/', authenticate, uploadAvatar, handleMulterError, ProfileController.updateProfile);

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
