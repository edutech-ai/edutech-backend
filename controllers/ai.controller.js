const cozeService = require('../services/coze.service');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { validationResult } = require('express-validator');

class AIController {
  /**
   * Generate quiz and create new quiz record - prompt case
   * POST /api/v1/ai/create-quiz-with-questions
   */
  static async createQuizWithQuestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Xác thực thất bại',
          errors: errors.array()
        });
      }

      const {
        // Quiz metadata
        title,
        description,
        subject,
        grade,
        duration,
        difficulty: quizDifficulty,
        status = 'draft',
        // Generation params
        topic,
        numberOfQuestions,
        questionTypes,
        customPrompt,
        quizMatrix,
      } = req.body;

      const teacherId = req.user.id;

      // 1. Create the quiz first
      const quizId = await Quiz.create({
        teacher_id: teacherId,
        title: title || `Đề thi AI - ${subject} Lớp ${grade}`,
        description: description || `Đề thi tự động về ${topic || subject}`,
        subject,
        grade,
        duration,
        difficulty: quizDifficulty || 'medium',
        status,
      });

      // 2. Generate questions using AI
      const result = await cozeService.generateAndNormalizeQuiz({
        subject,
        grade,
        topic,
        numberOfQuestions: numberOfQuestions || 10,
        questionTypes: questionTypes || ['MCQ'],
        difficulty: quizDifficulty || 'medium',
        customPrompt,
        quizMatrix,
      }, quizId);

      if (!result.success) {
        // Rollback: delete the quiz if generation failed
        await Quiz.delete(quizId);

        return res.status(500).json({
          success: false,
          message: 'Tạo câu hỏi thất bại',
          error: result.error,
        });
      }

      // 3. Save generated questions
      const { questions } = result.data;

      if (questions.length > 0) {
        await Question.bulkCreate(questions);
      }

      // 4. Get complete quiz with details
      const quiz = await Quiz.findByIdWithDetails(quizId);

      res.status(201).json({
        success: true,
        message: `Tạo đề thi quiz với ${questions.length} câu hỏi được tạo bởi AI`,
        data: {
          quiz,
          generationInfo: {
            chatId: result.chatId,
            conversationId: result.conversationId,
            metadata: result.data.metadata,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Tạo đề thi thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Analyze quiz quality using AI
   * POST /api/v1/ai/analyze-quiz
   */
  static async analyzeQuiz(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Xác thực thất bại',
          errors: errors.array()
        });
      }

      const { quiz_id, description } = req.body;
      const teacherId = req.user.id;

      // 1. Get quiz with questions from database
      const quiz = await Quiz.findByIdWithDetails(quiz_id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đề thi'
        });
      }

      // 2. Check permission
      if (quiz.teacher_id !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền phân tích đề thi này'
        });
      }

      // 3. Get questions for this quiz
      const questions = await Question.findByQuizId(quiz_id, true);

      // 4. Validate quiz has questions
      if (!questions || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Đề thi chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi phân tích.'
        });
      }

      // 5. Prepare quiz data for AI analysis with full context
      const quizData = {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          grade: quiz.grade,
          difficulty: quiz.difficulty,
          total_time: quiz.duration ? `${quiz.duration} phút` : 'Không giới hạn',
          user_description: description
        },
        questions: questions.map(q => ({
          id: q.id,
          content: q.content,
          type: q.type,
          point: q.point,
          answer: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty
        })),
        total: questions.length
      };

      // 4. Send to AI for analysis
      const result = await cozeService.analyzeQuiz(quizData);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Phân tích đề thi thất bại',
          error: result.error,
          rawContent: result.rawContent
        });
      }

      // 5. Return analysis
      res.status(200).json({
        success: true,
        message: 'Phân tích đề thi thành công',
        data: result.data,
        metadata: {
          quiz_id: quiz.id,
          quiz_title: quiz.title,
          analyzed_at: new Date().toISOString(),
          chatId: result.chatId,
          conversationId: result.conversationId
        }
      });
    } catch (error) {
      console.error('Error analyzing quiz:', error);
      res.status(500).json({
        success: false,
        message: 'Phân tích đề thi thất bại',
        error: error.message
      });
    }
  }
}

module.exports = AIController;
