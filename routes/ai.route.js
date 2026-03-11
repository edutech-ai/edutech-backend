/**
 * AI Routes
 * Endpoints for AI-powered features via Coze integration
 */
const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');
const { authenticate } = require('../middlewares/auth');
const { checkQuizQuota, checkAdvancedAIAccess } = require('../middlewares/quota');
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
  checkQuizQuota,
  createQuizWithQuestionsValidator,
  AIController.createQuizWithQuestions
);

/**
 * @swagger
 * /api/v1/ai/analyze-quiz:
 *   post:
 *     summary: Analyze quiz quality using AI
 *     description: Phân tích chất lượng đề thi bằng AI, bao gồm phân bố Bloom's Taxonomy, đánh giá từng câu hỏi, xác định khoảng trống kiến thức và đề xuất cải thiện. Kết quả không lưu vào database, frontend sẽ xử lý trong Local Storage.
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
 *               - quiz_id
 *             properties:
 *               quiz_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của đề thi cần phân tích
 *                 example: "019c08b3-92ff-7739-90d9-70a54c4342c7"
 *               description:
 *                 type: string
 *                 description: Mô tả bổ sung để cung cấp thêm context cho AI phân tích (tùy chọn)
 *                 example: "Đây là đề kiểm tra 15 phút cho học sinh trung bình, tập trung vào hình học cơ bản lớp 8"
 *     responses:
 *       200:
 *         description: Phân tích thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Phân tích đề thi thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysis_summary:
 *                       type: object
 *                       properties:
 *                         total_questions:
 *                           type: integer
 *                         total_points:
 *                           type: number
 *                         time_allocated:
 *                           type: string
 *                         overall_difficulty:
 *                           type: string
 *                         coverage:
 *                           type: string
 *                     bloom_distribution:
 *                       type: object
 *                       properties:
 *                         Nhận biết:
 *                           type: integer
 *                         Thông hiểu:
 *                           type: integer
 *                         Vận dụng:
 *                           type: integer
 *                         Phân tích:
 *                           type: integer
 *                         Đánh giá:
 *                           type: integer
 *                         Sáng tạo:
 *                           type: integer
 *                     question_evaluation:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           topic:
 *                             type: string
 *                           bloom_level:
 *                             type: string
 *                           difficulty:
 *                             type: string
 *                           clarity_score:
 *                             type: integer
 *                           knowledge_relevance:
 *                             type: integer
 *                           score:
 *                             type: integer
 *                           comments:
 *                             type: string
 *                     knowledge_gaps:
 *                       type: array
 *                       items:
 *                         type: string
 *                     ai_recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     quiz_id:
 *                       type: string
 *                     quiz_title:
 *                       type: string
 *                     analyzed_at:
 *                       type: string
 *                       format: date-time
 *                     chatId:
 *                       type: string
 *                     conversationId:
 *                       type: string
 *       400:
 *         description: Validation error hoặc đề thi chưa có câu hỏi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Đề thi chưa có câu hỏi nào. Vui lòng thêm câu hỏi trước khi phân tích."
 *       403:
 *         description: Không có quyền phân tích đề thi này
 *       404:
 *         description: Không tìm thấy đề thi
 *       500:
 *         description: Phân tích thất bại
 */
const { analyzeQuizValidator } = require('../middlewares/ai.validator');

router.post(
  '/analyze-quiz',
  authenticate,
  checkAdvancedAIAccess,
  analyzeQuizValidator,
  AIController.analyzeQuiz
);

/**
 * @swagger
 * /api/v1/ai/convert-exam:
 *   post:
 *     summary: Chuyển đổi đề thi PDF thành quiz trong hệ thống
 *     description: |
 *       Upload file đề thi (PDF, DOCX, v.v.) lên Coze AI để nhận dạng và chuyển đổi thành quiz.
 *       File sẽ được lưu vào thư viện tài liệu của giáo viên đồng thời.
 *       Giới hạn file: 5MB.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đề thi (PDF, DOCX, ...) tối đa 5MB
 *               title:
 *                 type: string
 *                 description: Tên đề thi (nếu không điền sẽ lấy từ tên file)
 *               subject:
 *                 type: string
 *                 example: "Toán"
 *               grade:
 *                 type: integer
 *                 example: 10
 *               duration:
 *                 type: integer
 *                 description: Thời gian làm bài (phút), nếu không điền AI sẽ tự phát hiện
 *     responses:
 *       201:
 *         description: Chuyển đổi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Chuyển đổi thành công 5 câu hỏi từ đề thi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     quiz:
 *                       type: object
 *                       description: Quiz đã tạo với đầy đủ thông tin
 *                     document:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         file_url:
 *                           type: string
 *                     conversionInfo:
 *                       type: object
 *                       properties:
 *                         total_questions:
 *                           type: integer
 *                         total_score:
 *                           type: number
 *                         total_minutes:
 *                           type: integer
 *       400:
 *         description: Không có file hoặc file quá lớn
 *       502:
 *         description: Upload file lên AI thất bại
 *       500:
 *         description: Chuyển đổi thất bại
 */
router.post(
  '/convert-exam',
  authenticate,
  checkQuizQuota,
  AIController.convertExamFromPDF
);

// /**
//  * @swagger
//  * /api/v1/ai/convert-exam/raw:
//  *   post:
//  *     summary: "DEBUG - Xem raw response từ AI khi convert đề thi"
//  *     description: Upload file và trả về đúng JSON thô mà AI trả ra, không lưu vào DB. Dùng để kiểm tra AI có đọc đúng file không.
//  *     tags: [AI]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         multipart/form-data:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - file
//  *             properties:
//  *               file:
//  *                 type: string
//  *                 format: binary
//  */
// router.post(
//   '/convert-exam/raw',
//   authenticate,
//   AIController.convertExamRaw
// );

module.exports = router;
