const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class ProfileController {
  static async getMyProfile(req, res) {
    try {
      const profile = await UserProfile.findFullProfileByUserId(req.user.id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.json({
        success: true,
        data: profile
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

  static async createProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const existingProfile = await UserProfile.findByUserId(req.user.id);
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: 'Profile already exists'
        });
      }

      const profileData = {
        name: req.body.name,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        avatar_url: req.body.avatar_url,
        address: req.body.address,
        email_notification: req.body.email_notification,
        push_notification: req.body.push_notification
      };

      const profile = await UserProfile.create(req.user.id, profileData);

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: profile
      });
    } catch (error) {
      console.error('Create profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create profile',
        error: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const existingProfile = await UserProfile.findByUserId(userId);

      // Helper: Convert string to boolean (for form-data)
      const toBoolean = (value) => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return undefined;
      };

      const profileData = {
        name: req.body.name,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        avatar_url: req.body.avatar_url,
        address: req.body.address,
        email_notification: toBoolean(req.body.email_notification),
        push_notification: toBoolean(req.body.push_notification)
      };

      // Update subject trong users table nếu có
      if (req.body.subject !== undefined) {
        const User = require('../models/User');
        await User.update(userId, { subject: req.body.subject });
      }

      if (!existingProfile) {
        const newProfile = await UserProfile.create(userId, profileData);

        return res.status(201).json({
          success: true,
          message: 'Profile created successfully',
          data: newProfile
        });
      }

      const updatedProfile = await UserProfile.update(userId, profileData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  static async deleteProfile(req, res) {
    try {
      const existingProfile = await UserProfile.findByUserId(req.user.id);
      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      await UserProfile.delete(req.user.id);

      res.json({
        success: true,
        message: 'Profile deleted successfully'
      });
    } catch (error) {
      console.error('Delete profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete profile',
        error: error.message
      });
    }
  }

  static async getProfileById(req, res) {
    try {
      const { userId } = req.params;

      const profile = await UserProfile.findFullProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      delete profile.email_notification;
      delete profile.push_notification;

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Lấy thống kê của giáo viên
  static async getTeacherStats(req, res) {
    try {
      const teacherId = req.user.id;

      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Chỉ giáo viên mới có thể xem thống kê'
        });
      }

      const db = require('../config/database');

      const [quizResult] = await db.query(
        'SELECT COUNT(*) as count FROM quizzes WHERE teacher_id = ? AND is_deleted = FALSE',
        [teacherId]
      );
      const totalQuizzes = quizResult[0].count;

      const [matrixResult] = await db.query(
        'SELECT COUNT(*) as count FROM exam_matrices WHERE teacher_id = ? AND is_deleted = FALSE',
        [teacherId]
      );
      const totalMatrices = matrixResult[0].count;

      const [studentResult] = await db.query(
        'SELECT COUNT(DISTINCT cs.student_id) as count FROM classroom_students cs ' +
        'INNER JOIN classrooms c ON cs.classroom_id = c.id ' +
        'WHERE c.teacher_id = ?',
        [teacherId]
      );
      const totalStudents = studentResult[0].count;

      const [classroomResult] = await db.query(
        'SELECT COUNT(*) as count FROM classrooms WHERE teacher_id = ?',
        [teacherId]
      );
      const totalClassrooms = classroomResult[0].count;

      res.json({
        success: true,
        data: {
          total_quizzes: totalQuizzes,
          total_matrices: totalMatrices,
          total_students: totalStudents,
          total_classrooms: totalClassrooms
        }
      });
    } catch (error) {
      console.error('Get teacher stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể lấy thống kê',
        error: error.message
      });
    }
  }

  // Lấy hoạt động gần đây của giáo viên
  static async getRecentActivities(req, res) {
    try {
      const teacherId = req.user.id;

      if (req.user.role !== 'TEACHER') {
        return res.status(403).json({
          success: false,
          message: 'Chỉ giáo viên mới có thể xem hoạt động'
        });
      }

      const db = require('../config/database');
      const activities = [];

      // 1. Lấy các quiz mới tạo
      const [quizzes] = await db.query(
        `SELECT id, title, created_at, 'quiz_created' as activity_type 
         FROM quizzes 
         WHERE teacher_id = ? AND is_deleted = FALSE 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [teacherId]
      );

      quizzes.forEach(q => {
        activities.push({
          type: 'quiz_created',
          title: 'Tạo đề kiểm tra mới',
          description: q.title,
          timestamp: q.created_at,
          metadata: { quiz_id: q.id }
        });
      });

      // 2. Lấy các ma trận mới tạo
      const [matrices] = await db.query(
        `SELECT id, name, created_at, 'matrix_created' as activity_type 
         FROM exam_matrices 
         WHERE teacher_id = ? AND is_deleted = FALSE 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [teacherId]
      );

      matrices.forEach(m => {
        activities.push({
          type: 'matrix_created',
          title: 'Tạo ma trận đề thi mới',
          description: m.name,
          timestamp: m.created_at,
          metadata: { matrix_id: m.id }
        });
      });

      // 3. Lấy các bài kiểm tra đã chấm gần đây
      const [scores] = await db.query(
        `SELECT ss.quiz_id,
                MAX(ss.exam_name) as exam_name,
                MAX(ss.created_at) as created_at,
                COUNT(DISTINCT ss.student_id) as student_count,
                MAX(q.title) as quiz_title
         FROM student_scores ss
         LEFT JOIN quizzes q ON ss.quiz_id = q.id
         LEFT JOIN classrooms c ON ss.classroom_id = c.id
         WHERE c.teacher_id = ? 
         GROUP BY ss.quiz_id
         ORDER BY MAX(ss.created_at) DESC 
         LIMIT 10`,
        [teacherId]
      );

      scores.forEach(s => {
        activities.push({
          type: 'grading_completed',
          title: 'Hoàn thành chấm bài',
          description: `Đã chấm xong ${s.student_count} bài thi${s.quiz_title ? ': ' + s.quiz_title : ''}`,
          timestamp: s.created_at,
          metadata: {
            quiz_id: s.quiz_id,
            student_count: s.student_count
          }
        });
      });

      // Sắp xếp tất cả activities theo thời gian giảm dần và lấy 10 cái mới nhất
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentActivities = activities.slice(0, 10);

      res.json({
        success: true,
        data: recentActivities
      });
    } catch (error) {
      console.error('Get recent activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể lấy hoạt động gần đây',
        error: error.message
      });
    }
  }
}

module.exports = ProfileController;
