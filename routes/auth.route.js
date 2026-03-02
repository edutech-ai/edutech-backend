const express = require('express');
const passport = require('../config/passport');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const {
  registerValidation,
  verifyRegisterValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../middlewares/auth.validator');
const { verifyOTPValidation } = require('../middlewares/otp.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: teacher@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [STUDENT, TEACHER, ADMIN]
 *                 default: TEACHER
 *               subject:
 *                 type: string
 *                 enum: [TOAN, VAN, ANH, LY, HOA, SINH, SU, DIA, GDCD, TIN, CN]
 *                 description: Môn dạy (chỉ dành cho TEACHER)
 *     responses:
 *       200:
 *         description: OTP đã được gửi đến email
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
 *                     email:
 *                       type: string
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Email đã tồn tại
 */
router.post('/register', registerValidation, AuthController.register);

/**
 * @swagger
 * /api/v1/auth/verify-register:
 *   post:
 *     summary: Xác thực OTP và hoàn tất đăng ký
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: teacher@example.com
 *               otpCode:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: \"123456\"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
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
 *                     userId:
 *                       type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: OTP không hợp lệ hoặc session hết hạn
 */
router.post('/verify-register', verifyRegisterValidation, AuthController.verifyRegister);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: kettek9812@gmail.com
 *               password:
 *                 type: string
 *                 example: Test@1234
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         subject:
 *                           type: string
 *                         status:
 *                           type: string
 *                     token:
 *                       type: string
 *       401:
 *         description: Email hoặc password không đúng
 *       403:
 *         description: Tài khoản bị khóa
 */
router.post('/login', loginValidation, AuthController.login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Đăng xuất (client-side xóa token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', AuthController.logout);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Lấy thông tin người dùng đang đăng nhập
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin user thành công
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
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/profile', authenticate, AuthController.getProfile);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldpass123
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpass123
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Mật khẩu hiện tại không đúng
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/change-password', authenticate, changePasswordValidation, AuthController.changePassword);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Quên mật khẩu - Gửi mã OTP qua email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Mã OTP đã được gửi đến email
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
 *                     email:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *       404:
 *         description: Email không tồn tại
 */
router.post('/forgot-password', forgotPasswordValidation, AuthController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Xác thực OTP và đặt lại mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otpCode:
 *                 type: string
 *                 example: "123456"
 *                 description: Mã OTP 6 số
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: OTP không hợp lệ hoặc đã hết hạn
 */
router.post('/verify-otp', verifyOTPValidation, AuthController.verifyOTP);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset mật khẩu (alias của verify-otp)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otpCode:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset mật khẩu thành công
 *       400:
 *         description: OTP không hợp lệ
 */
router.post('/reset-password', verifyOTPValidation, AuthController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Chuyển hướng sang Google để đăng nhập
 *     tags: [Authentication]
 *     description: Endpoint này sẽ redirect người dùng sang trang đăng nhập Google OAuth
 *     responses:
 *       302:
 *         description: Redirect sang Google OAuth
 */
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Callback sau khi đăng nhập Google
 *     tags: [Authentication]
 *     description: Google sẽ redirect về endpoint này sau khi user đăng nhập thành công
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code từ Google
 *     responses:
 *       302:
 *         description: Redirect về frontend với token hoặc error
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  AuthController.googleCallback
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Làm mới access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token nhận được khi login
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Access token mới
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
 *                     accessToken:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *       401:
 *         description: Refresh token không hợp lệ hoặc đã hết hạn
 */
router.post('/refresh-token', AuthController.refreshToken);

module.exports = router;
