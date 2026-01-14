const express = require('express');
const QuizController = require('../controllers/quiz.controller');
const { authenticate } = require('../middlewares/auth');
const {
  createQuizValidation,
  updateQuizValidation,
  quizIdValidation,
  examCodeValidation,
  quizQueryValidation
} = require('../middlewares/quiz.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz management APIs
 */

/**
 * @swagger
 * /api/v1/quizzes:
 *   post:
 *     summary: Tạo quiz mới (Teacher only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Kiểm tra giữa kỳ Toán 12
 *               description:
 *                 type: string
 *                 example: Bài kiểm tra chương 1-3
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 default: medium
 *               exam_code:
 *                 type: string
 *                 example: MATH12-2024-Q1
 *               qr_code:
 *                 type: string
 *                 example: https://example.com/qr/quiz123.png
 *               status:
 *                 type: string
 *                 enum: [draft, public, archived]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Exam code already exists
 */
router.post('/', authenticate, createQuizValidation, QuizController.createQuiz);

/**
 * @swagger
 * /api/v1/quizzes/my-quizzes:
 *   get:
 *     summary: Lấy danh sách quiz của giáo viên (Teacher only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, public, archived]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Lọc theo độ khó
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên quiz
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of quizzes
 *       401:
 *         description: Unauthorized
 */
router.get('/my-quizzes', authenticate, quizQueryValidation, QuizController.getMyQuizzes);

/**
 * @swagger
 * /api/v1/quizzes/public:
 *   get:
 *     summary: Lấy danh sách quiz công khai (All users)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of public quizzes
 */
router.get('/public', authenticate, quizQueryValidation, QuizController.getPublicQuizzes);

/**
 * @swagger
 * /api/v1/quizzes/exam-code/{examCode}:
 *   get:
 *     summary: Lấy quiz theo exam code
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam code
 *     responses:
 *       200:
 *         description: Quiz details
 *       404:
 *         description: Quiz not found
 */
router.get('/exam-code/:examCode', authenticate, examCodeValidation, QuizController.getQuizByExamCode);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   get:
 *     summary: Lấy chi tiết quiz
 *     tags: [Quizzes]
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
 *         description: Quiz details
 *       404:
 *         description: Quiz not found
 */
router.get('/:id', authenticate, quizIdValidation, QuizController.getQuizById);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   put:
 *     summary: Cập nhật quiz (Teacher only - Owner)
 *     tags: [Quizzes]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               exam_code:
 *                 type: string
 *               qr_code:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, public, archived]
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.put('/:id', authenticate, updateQuizValidation, QuizController.updateQuiz);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   delete:
 *     summary: Xóa quiz (Teacher only - Owner)
 *     tags: [Quizzes]
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
 *         description: Quiz deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.delete('/:id', authenticate, quizIdValidation, QuizController.deleteQuiz);

/**
 * @swagger
 * /api/v1/quizzes/{id}/questions:
 *   get:
 *     summary: Lấy tất cả câu hỏi của quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/questions', authenticate, quizIdValidation, QuizController.getQuizQuestions);

/**
 * @swagger
 * /api/v1/quizzes/{id}/stats:
 *   get:
 *     summary: Lấy thống kê quiz (Teacher only - Owner)
 *     tags: [Quizzes]
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
 *         description: Quiz statistics
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.get('/:id/stats', authenticate, quizIdValidation, QuizController.getQuizStats);

module.exports = router;
