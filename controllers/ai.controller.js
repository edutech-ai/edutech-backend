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
}

module.exports = AIController;
