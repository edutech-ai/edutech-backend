const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const RefreshToken = require('../models/RefreshToken');
const { sendOTPEmail } = require('../config/email');
const { validationResult } = require('express-validator');
const NotificationHelper = require('../utils/notificationHelper');

class AuthController {
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, role, subject } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Tạo và gửi OTP để verify email
      const { otpCode } = await OTP.create(null, email);
      await sendOTPEmail(email, otpCode, 'register');

      // Lưu thông tin registration tạm vào session/memory
      // Store trong Redis với key: pending_register:{email}
      const redisClient = require('../config/redis');
      await redisClient.setEx(
        `pending_register:${email}`,
        600, // 10 phút
        JSON.stringify({ email, password, role: role || 'TEACHER', subject })
      );

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email. Please verify to complete registration.',
        data: { email }
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

  static async verifyRegister(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, otpCode } = req.body;

      // Verify OTP
      const isValid = await OTP.verify(email, otpCode);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Lấy thông tin registration từ Redis
      const redisClient = require('../config/redis');
      const pendingData = await redisClient.get(`pending_register:${email}`);

      if (!pendingData) {
        return res.status(400).json({
          success: false,
          message: 'Registration session expired. Please register again.'
        });
      }

      const { password, role, subject } = JSON.parse(pendingData);

      // Tạo user
      const userId = await User.create({
        email,
        password,
        role,
        subject: (role === 'TEACHER' && subject) ? subject : null
      });

      // Xóa pending data
      await redisClient.del(`pending_register:${email}`);

      // Generate JWT token
      const { generateAccessToken, generateRefreshToken } = require('../utils/tokenHelper');

      // Generate access token và refresh token
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      // Lưu refresh token vào database
      await RefreshToken.create(userId, refreshToken);

      // Tạo thông báo chào mừng
      NotificationHelper.notifyAccountCreated(userId).catch(err =>
        console.error('Create notification error:', err)
      );

      res.status(201).json({
        success: true,
        message: 'Registration verified successfully',
        data: {
          userId,
          accessToken,
          refreshToken,
          expiresIn: 900 // 15 phút (seconds)
        }
      });
    } catch (error) {
      console.error('Verify register error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

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

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is banned'
        });
      }

      const isPasswordValid = await User.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const { generateAccessToken, generateRefreshToken } = require('../utils/tokenHelper');

      // Generate access token và refresh token
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Lưu refresh token vào database
      await RefreshToken.create(user.id, refreshToken);

      // Tạo thông báo đăng nhập
      NotificationHelper.notifyLogin(user.id)
        .then(notificationId => {
          console.log('✅ Login notification created successfully:', notificationId);
        })
        .catch(err => {
          console.error('❌ Create notification error:', err);
        });

      delete user.password_hash;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          accessToken,
          refreshToken,
          expiresIn: 900 // 15 phút (seconds)
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

  static async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findByEmail(req.user.email);

      const isPasswordValid = await User.comparePassword(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      await User.changePassword(req.user.id, newPassword);

      // Tạo thông báo đổi mật khẩu
      NotificationHelper.notifyPasswordChanged(req.user.id).catch(err =>
        console.error('Create notification error:', err)
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }

      // Import OTP model và email service
      const OTP = require('../models/OTP');
      const { sendOTPEmail } = require('../config/email');

      // Xóa OTP cũ (nếu có)
      await OTP.deleteOldOTPs(email);

      // Tạo OTP mới
      const { otpCode, expiresAt } = await OTP.create(user.id, email);

      // Gửi email
      try {
        await sendOTPEmail(email, otpCode, user.email);

        // Tạo thông báo gửi email reset password
        NotificationHelper.notifyPasswordResetEmail(user.id).catch(err =>
          console.error('Create notification error:', err)
        );

        res.json({
          success: true,
          message: 'Mã OTP đã được gửi đến email của bạn',
          data: {
            email,
            expiresIn: '5 phút'
          }
        });
      } catch (emailError) {
        console.error('Send email error:', emailError);
        res.status(500).json({
          success: false,
          message: 'Không thể gửi email. Vui lòng thử lại sau',
          error: emailError.message
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process forgot password request',
        error: error.message
      });
    }
  }

  static async verifyOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, otpCode, newPassword } = req.body;

      const OTP = require('../models/OTP');
      const { sendPasswordChangedEmail } = require('../config/email');

      // Verify OTP
      const verifyResult = await OTP.verify(email, otpCode);

      if (!verifyResult.valid) {
        return res.status(400).json({
          success: false,
          message: verifyResult.message
        });
      }

      // Đổi mật khẩu
      await User.changePassword(verifyResult.userId, newPassword);

      // Gửi email thông báo (optional, không chặn request)
      sendPasswordChangedEmail(email).catch(err =>
        console.error('Send notification email error:', err)
      );

      res.json({
        success: true,
        message: 'Đặt lại mật khẩu thành công'
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
        error: error.message
      });
    }
  }

  static async resetPassword(req, res) {
    // Alias for verifyOTP (backward compatibility)
    return this.verifyOTP(req, res);
  }

  // Refresh access token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const { verifyRefreshToken, generateAccessToken } = require('../utils/tokenHelper');

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Kiểm tra refresh token có trong database và chưa bị revoke
      const tokenData = await RefreshToken.findByToken(refreshToken);
      if (!tokenData) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token not found or has been revoked'
        });
      }

      // Generate access token mới
      const newAccessToken = generateAccessToken(decoded.userId);

      res.json({
        success: true,
        message: 'Access token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          expiresIn: 900 // 15 phút
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: error.message
      });
    }
  }

  // Google OAuth Success Handler
  static async googleCallback(req, res) {
    try {
      if (!req.user) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=auth_failed`);
      }

      const { generateAccessToken, generateRefreshToken } = require('../utils/tokenHelper');

      // Generate access token và refresh token
      const accessToken = generateAccessToken(req.user.id);
      const refreshToken = generateRefreshToken(req.user.id);

      // Lưu refresh token vào database
      await RefreshToken.create(req.user.id, refreshToken);

      // Redirect về frontend với cả 2 tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/google/success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
}

module.exports = AuthController;
