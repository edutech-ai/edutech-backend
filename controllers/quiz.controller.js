const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { validationResult } = require('express-validator');

class QuizController {
  // Tạo quiz mới
  static async createQuiz(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title, description, difficulty, exam_code, qr_code, status } = req.body;
      const teacher_id = req.user.id;

      // Kiểm tra exam_code đã tồn tại chưa (nếu có)
      if (exam_code) {
        const existingQuiz = await Quiz.findByExamCode(exam_code);
        if (existingQuiz) {
          return res.status(409).json({
            success: false,
            message: 'Exam code already exists'
          });
        }
      }

      const quizId = await Quiz.create({
        teacher_id,
        title,
        description,
        difficulty,
        exam_code,
        qr_code,
        status
      });

      const quiz = await Quiz.findById(quizId);

      res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        data: quiz
      });
    } catch (error) {
      console.error('Create quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quiz',
        error: error.message
      });
    }
  }

  // Lấy danh sách quiz của giáo viên
  static async getMyQuizzes(req, res) {
    try {
      const teacherId = req.user.id;
      const { status, difficulty, search, page, limit } = req.query;

      const filters = {
        status,
        difficulty,
        search,
        page: page || 1,
        limit: limit || 20
      };

      const quizzes = await Quiz.findByTeacherId(teacherId, filters);
      const total = await Quiz.countByTeacherId(teacherId, { status });

      res.json({
        success: true,
        data: quizzes,
        pagination: {
          page: parseInt(filters.page),
          limit: parseInt(filters.limit),
          total,
          totalPages: Math.ceil(total / parseInt(filters.limit))
        }
      });
    } catch (error) {
      console.error('Get my quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quizzes',
        error: error.message
      });
    }
  }

  // Lấy danh sách quiz công khai (cho học sinh)
  static async getPublicQuizzes(req, res) {
    try {
      const { difficulty, search, page, limit } = req.query;

      const filters = {
        difficulty,
        search,
        page: page || 1,
        limit: limit || 20
      };

      const quizzes = await Quiz.findPublicQuizzes(filters);

      res.json({
        success: true,
        data: quizzes,
        pagination: {
          page: parseInt(filters.page),
          limit: parseInt(filters.limit)
        }
      });
    } catch (error) {
      console.error('Get public quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch public quizzes',
        error: error.message
      });
    }
  }

  // Lấy quiz theo ID (với chi tiết)
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;
      const quiz = await Quiz.findByIdWithDetails(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Kiểm tra quyền truy cập
      // Nếu là quiz private và không phải owner
      if (quiz.status !== 'public' && quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Get quiz by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz',
        error: error.message
      });
    }
  }

  // Lấy quiz theo exam code
  static async getQuizByExamCode(req, res) {
    try {
      const { examCode } = req.params;
      const quiz = await Quiz.findByExamCode(examCode);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found with this exam code'
        });
      }

      // Chỉ cho phép truy cập quiz public hoặc owner
      if (quiz.status !== 'public' && quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'This quiz is not public'
        });
      }

      res.json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Get quiz by exam code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz',
        error: error.message
      });
    }
  }

  // Cập nhật quiz
  static async updateQuiz(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const quiz = await Quiz.findById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Kiểm tra quyền sở hữu
      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this quiz'
        });
      }

      // Kiểm tra exam_code mới (nếu có)
      if (req.body.exam_code && req.body.exam_code !== quiz.exam_code) {
        const existingQuiz = await Quiz.findByExamCode(req.body.exam_code);
        if (existingQuiz) {
          return res.status(409).json({
            success: false,
            message: 'Exam code already exists'
          });
        }
      }

      const updatedQuiz = await Quiz.update(id, req.body);

      res.json({
        success: true,
        message: 'Quiz updated successfully',
        data: updatedQuiz
      });
    } catch (error) {
      console.error('Update quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update quiz',
        error: error.message
      });
    }
  }

  // Xóa quiz (soft delete)
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;
      const quiz = await Quiz.findById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Kiểm tra quyền sở hữu
      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this quiz'
        });
      }

      await Quiz.delete(id);

      res.json({
        success: true,
        message: 'Quiz deleted successfully'
      });
    } catch (error) {
      console.error('Delete quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete quiz',
        error: error.message
      });
    }
  }

  // Lấy câu hỏi của quiz
  static async getQuizQuestions(req, res) {
    try {
      const { id } = req.params;
      const { includeAnswers } = req.query;
      
      const quiz = await Quiz.findById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Kiểm tra quyền truy cập
      const isOwner = quiz.teacher_id === req.user.id;
      const isPublic = quiz.status === 'public';

      if (!isOwner && !isPublic) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Chỉ owner mới xem được đáp án khi includeAnswers=true
      const showAnswers = includeAnswers === 'true' && isOwner;
      const questions = await Question.findByQuizId(id, showAnswers);

      res.json({
        success: true,
        data: {
          quiz: {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            difficulty: quiz.difficulty
          },
          questions,
          total: questions.length
        }
      });
    } catch (error) {
      console.error('Get quiz questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions',
        error: error.message
      });
    }
  }

  // Thống kê quiz
  static async getQuizStats(req, res) {
    try {
      const { id } = req.params;
      const quiz = await Quiz.findById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Kiểm tra quyền sở hữu
      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const questionCount = await Quiz.countQuestions(id);
      const totalPoints = await Quiz.getTotalPoints(id);
      const questionsByType = await Question.countByType(id);

      res.json({
        success: true,
        data: {
          quiz_id: id,
          quiz_title: quiz.title,
          total_questions: questionCount,
          total_points: totalPoints,
          questions_by_type: questionsByType
        }
      });
    } catch (error) {
      console.error('Get quiz stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz statistics',
        error: error.message
      });
    }
  }
}

module.exports = QuizController;
