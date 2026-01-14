const express = require('express');
const QuestionController = require('../controllers/question.controller');
const { authenticate } = require('../middlewares/auth');
const {
  createQuestionValidation,
  bulkCreateQuestionsValidation,
  updateQuestionValidation,
  questionIdValidation,
  quizIdParamValidation,
  documentIdParamValidation,
  questionQueryValidation
} = require('../middlewares/question.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Question management APIs
 */

/**
 * @swagger
 * /api/v1/questions:
 *   post:
 *     summary: Tạo câu hỏi mới (Teacher only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quiz_id
 *               - content
 *               - correct_answer
 *             properties:
 *               quiz_id:
 *                 type: string
 *                 format: uuid
 *               document_id:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *                 example: 2 + 2 = ?
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["3", "4", "5", "6"]
 *               correct_answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                 example: "4"
 *               type:
 *                 type: string
 *                 enum: [MCQ, ESSAY, TRUE_FALSE, MULTIPLE_ANSWER]
 *                 default: MCQ
 *               point:
 *                 type: number
 *                 default: 1.0
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Question created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.post('/', authenticate, createQuestionValidation, QuestionController.createQuestion);

/**
 * @swagger
 * /api/v1/questions/bulk:
 *   post:
 *     summary: Tạo nhiều câu hỏi cùng lúc (Teacher only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quiz_id
 *               - questions
 *             properties:
 *               quiz_id:
 *                 type: string
 *                 format: uuid
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - content
 *                     - correct_answer
 *                   properties:
 *                     content:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correct_answer:
 *                       oneOf:
 *                         - type: string
 *                         - type: array
 *                     type:
 *                       type: string
 *                       enum: [MCQ, ESSAY, TRUE_FALSE, MULTIPLE_ANSWER]
 *                     point:
 *                       type: number
 *                     explanation:
 *                       type: string
 *                     document_id:
 *                       type: string
 *                       format: uuid
 *     responses:
 *       201:
 *         description: Questions created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post('/bulk', authenticate, bulkCreateQuestionsValidation, QuestionController.bulkCreateQuestions);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   get:
 *     summary: Lấy chi tiết câu hỏi
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Question details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Question not found
 */
router.get('/:id', authenticate, questionIdValidation, QuestionController.getQuestionById);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   put:
 *     summary: Cập nhật câu hỏi (Teacher only - Owner)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correct_answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *               type:
 *                 type: string
 *                 enum: [MCQ, ESSAY, TRUE_FALSE, MULTIPLE_ANSWER]
 *               point:
 *                 type: number
 *               explanation:
 *                 type: string
 *               document_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Question not found
 */
router.put('/:id', authenticate, updateQuestionValidation, QuestionController.updateQuestion);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   delete:
 *     summary: Xóa câu hỏi (Teacher only - Owner)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Question not found
 */
router.delete('/:id', authenticate, questionIdValidation, QuestionController.deleteQuestion);

/**
 * @swagger
 * /api/v1/questions/quiz/{quizId}:
 *   get:
 *     summary: Lấy tất cả câu hỏi của một quiz
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeAnswers
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Include correct answers (Owner only)
 *     responses:
 *       200:
 *         description: List of questions
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.get('/quiz/:quizId', authenticate, quizIdParamValidation, questionQueryValidation, QuestionController.getQuestionsByQuizId);

/**
 * @swagger
 * /api/v1/questions/quiz/{quizId}:
 *   delete:
 *     summary: Xóa tất cả câu hỏi của một quiz (Teacher only - Owner)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: All questions deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.delete('/quiz/:quizId', authenticate, quizIdParamValidation, QuestionController.deleteQuestionsByQuizId);

/**
 * @swagger
 * /api/v1/questions/document/{documentId}:
 *   get:
 *     summary: Lấy tất cả câu hỏi của một document
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of questions
 *       404:
 *         description: Document not found
 */
router.get('/document/:documentId', authenticate, documentIdParamValidation, QuestionController.getQuestionsByDocumentId);

module.exports = router;
