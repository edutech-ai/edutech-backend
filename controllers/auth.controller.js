const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class AuthController {
  /**
   * @swagger
   * /api/v1/auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Đăng ký tài khoản mới
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
   *       201:
   *         description: Đăng ký thành công
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       409:
   *         description: Email đã tồn tại
   */
  static async register(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, role, subject } = req.body;

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Tạo user mới
      const userId = await User.create({ 
        email, 
        password, 
        role: role || 'TEACHER',
        subject: (role === 'TEACHER' && subject) ? subject : null
      });

      // Tạo JWT token
      const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId,
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Đăng nhập
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
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Đăng nhập thành công
   *       401:
   *         description: Email hoặc password không đúng
   *       403:
   *         description: Tài khoản bị khóa
   */
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Tìm user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Kiểm tra status
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is banned'
        });
      }

      // Kiểm tra password
      const isPasswordValid = await User.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Tạo JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      // Không trả về password
      delete user.password_hash;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/auth/profile:
   *   get:
   *     tags: [Auth]
   *     summary: Lấy thông tin người dùng đang đăng nhập
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Thành công
   *       401:
   *         description: Chưa đăng nhập
   */
  static async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;
