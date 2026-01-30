/**
 * AI Routes
 * Endpoints for AI-powered features via Coze integration
 */
const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');
const { authenticate } = require('../middlewares/auth');
const { createQuizWithQuestionsValidator } = require('../middlewares/ai.validator');

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered features (Quiz generation)
 */

/**
 * @swagger
 * /api/v1/ai/create-quiz-with-questions:
 *   post:
 *     summary: Create a new quiz and generate questions using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - grade
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Toán 8 - Đại số"
 *               description:
 *                 type: string
 *                 example: "Bài kiểm tra 15 phút về đại số cho lớp 8"  
 *               subject:
 *                 type: string
 *                 example: "Mathematics"
 *               grade:
 *                 type: integer
 *                 example: 8
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               status:
 *                 type: string
 *                 enum: [draft, public, private]
 *               topic:
 *                 type: string
 *               numberOfQuestions:
 *                 type: integer
 *               questionTypes:
 *                 type: array
 *                 items:
 *                   type: MCQ
 *               customPrompt:
 *                 type: string
 *                 example: "Tạo 3 câu hỏi trắc nghiệm về đại số cho học sinh lớp 8"
 *               quizMatrix:
 *                 type: object
 *     responses:
 *       201:
 *         description: Quiz created with AI-generated questions
 *       400:
 *         description: Validation error
 *       500:
 *         description: Creation failed
 */
router.post(
  '/create-quiz-with-questions',
  authenticate,
  createQuizWithQuestionsValidator,
  AIController.createQuizWithQuestions
);

module.exports = router;
