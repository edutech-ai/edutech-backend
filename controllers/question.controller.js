const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const { validationResult } = require('express-validator');

class QuestionController {
  // Tạo câu hỏi mới
  static async createQuestion(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { quiz_id, document_id, content, options, correct_answer, type, point, explanation } = req.body;

      // Kiểm tra quiz có tồn tại và user có quyền không
      const quiz = await Quiz.findById(quiz_id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add questions to this quiz'
        });
      }

      const questionId = await Question.create({
        quiz_id,
        document_id,
        content,
        options,
        correct_answer,
        type,
        point,
        explanation
      });

      const question = await Question.findById(questionId);

      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: question
      });
    } catch (error) {
      console.error('Create question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create question',
        error: error.message
      });
    }
  }

  // Tạo nhiều câu hỏi cùng lúc (bulk create)
  static async bulkCreateQuestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { quiz_id, questions } = req.body;

      // Kiểm tra quiz
      const quiz = await Quiz.findById(quiz_id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add questions to this quiz'
        });
      }

      // Thêm quiz_id vào mỗi câu hỏi
      const questionsWithQuizId = questions.map(q => ({
        ...q,
        quiz_id
      }));

      const questionIds = await Question.bulkCreate(questionsWithQuizId);

      res.status(201).json({
        success: true,
        message: `${questionIds.length} questions created successfully`,
        data: {
          quiz_id,
          created_count: questionIds.length,
          question_ids: questionIds
        }
      });
    } catch (error) {
      console.error('Bulk create questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create questions',
        error: error.message
      });
    }
  }

  // Lấy câu hỏi theo ID
  static async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const question = await Question.findById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Kiểm tra quyền truy cập
      const quiz = await Quiz.findById(question.quiz_id);
      if (quiz.status !== 'public' && quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: question
      });
    } catch (error) {
      console.error('Get question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch question',
        error: error.message
      });
    }
  }

  // Lấy tất cả câu hỏi của một quiz
  static async getQuestionsByQuizId(req, res) {
    try {
      const { quizId } = req.params;
      const { includeAnswers } = req.query;

      const quiz = await Quiz.findById(quizId);
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

      // Chỉ owner mới xem được đáp án
      const showAnswers = includeAnswers === 'true' && isOwner;
      const questions = await Question.findByQuizId(quizId, showAnswers);

      res.json({
        success: true,
        data: questions,
        total: questions.length
      });
    } catch (error) {
      console.error('Get questions by quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions',
        error: error.message
      });
    }
  }

  // Cập nhật câu hỏi
  static async updateQuestion(req, res) {
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
      const question = await Question.findById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Kiểm tra quyền sở hữu quiz
      const quiz = await Quiz.findById(question.quiz_id);
      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this question'
        });
      }

      const updatedQuestion = await Question.update(id, req.body);

      res.json({
        success: true,
        message: 'Question updated successfully',
        data: updatedQuestion
      });
    } catch (error) {
      console.error('Update question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update question',
        error: error.message
      });
    }
  }

  // Xóa câu hỏi (soft delete)
  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await Question.findById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      // Kiểm tra quyền sở hữu quiz
      const quiz = await Quiz.findById(question.quiz_id);
      if (quiz.teacher_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this question'
        });
      }

      await Question.delete(id);

      res.json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete question',
        error: error.message
      });
    }
  }

  // Xóa tất cả câu hỏi của một quiz
  static async deleteQuestionsByQuizId(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quiz.findById(quizId);
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
          message: 'You do not have permission to delete questions from this quiz'
        });
      }

      await Question.deleteByQuizId(quizId);

      res.json({
        success: true,
        message: 'All questions deleted successfully'
      });
    } catch (error) {
      console.error('Delete all questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete questions',
        error: error.message
      });
    }
  }

  // Lấy câu hỏi theo document_id
  static async getQuestionsByDocumentId(req, res) {
    try {
      const { documentId } = req.params;
      const questions = await Question.findByDocumentId(documentId);

      res.json({
        success: true,
        data: questions,
        total: questions.length
      });
    } catch (error) {
      console.error('Get questions by document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions',
        error: error.message
      });
    }
  }
}

module.exports = QuestionController;
