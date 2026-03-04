const express = require('express');
const router = express.Router();
const omrController = require('../controllers/omr.controller');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: OMR
 *   description: Optical Mark Recognition - Chấm điểm tự động
 */

/**
 * @swagger
 * /api/v1/omr/answer-key/preview/{quiz_id}:
 *   get:
 *     summary: Preview answer key trước khi tạo batch
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quiz_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quiz
 *     responses:
 *       200:
 *         description: Preview thành công
 *       404:
 *         description: Quiz không tồn tại
 */
router.get('/answer-key/preview/:quiz_id', authenticate, authorize('TEACHER'), omrController.previewAnswerKey);

/**
 * @swagger
 * /api/v1/omr/answer-key/batch/{batch_id}:
 *   get:
 *     summary: Lấy đáp án chuẩn của đợt thi theo mã đề
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của exam batch
 *       - in: query
 *         name: exam_code
 *         required: false
 *         schema:
 *           type: string
 *         description: "Mã đề (3 chữ số, VD: 234) - dùng để xác minh khớp với batch"
 *     responses:
 *       200:
 *         description: Đáp án chuẩn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     batch_id:
 *                       type: string
 *                     exam_code:
 *                       type: string
 *                       description: Mã đề 3 chữ số
 *                     quiz_title:
 *                       type: string
 *                     total_questions:
 *                       type: integer
 *                     correct_answers:
 *                       type: object
 *                       description: "Map số câu -> A/B/C/D (VD: {\"1\":\"A\",\"2\":\"C\"})"
 *                     default_score_per_question:
 *                       type: number
 *       404:
 *         description: Batch không tồn tại hoặc mã đề không khớp
 */
router.get('/answer-key/batch/:batch_id', authenticate, omrController.getAnswerKeyByExamCode);

/**
 * @swagger
 * /api/v1/omr/exam-batches:
 *   post:
 *     summary: Tạo đợt thi mới
 *     tags: [OMR]
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
 *               - classroom_id
 *               - name
 *             properties:
 *               quiz_id:
 *                 type: string
 *               classroom_id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               batch_type:
 *                 type: string
 *                 enum: [exam, practice, homework, quiz]
 *               access_code:
 *                 type: string
 *                 description: "Mã đề thi (VD 001, 002, A, B, C) để phân biệt các version đề khác nhau"
 *               start_at:
 *                 type: string
 *                 format: date-time
 *               end_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       404:
 *         description: Quiz hoặc Classroom không tồn tại
 */
router.post('/exam-batches', authenticate, authorize('TEACHER'), omrController.createExamBatch);

/**
 * @swagger
 * /api/v1/omr/exam-batches/classroom/{classroom_id}:
 *   get:
 *     summary: Lấy danh sách exam batches của classroom
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroom_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, open, closed, completed]
 *       - in: query
 *         name: batch_type
 *         schema:
 *           type: string
 *           enum: [exam, practice, homework, quiz]
 *     responses:
 *       200:
 *         description: Danh sách batches
 */
router.get('/exam-batches/classroom/:classroom_id', authenticate, omrController.getExamBatches);

/**
 * @swagger
 * /api/v1/omr/exam-batches/{batch_id}:
 *   get:
 *     summary: Lấy chi tiết exam batch
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của exam batch
 *     responses:
 *       200:
 *         description: Chi tiết batch
 */
router.get('/exam-batches/:batch_id', authenticate, omrController.getExamBatchDetail);

/**
 * @swagger
 * /api/v1/omr/exam-batches/{batch_id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái exam batch
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của exam batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, open, closed, completed]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/exam-batches/:batch_id/status', authenticate, authorize('TEACHER'), omrController.updateExamBatchStatus);

/**
 * @swagger
 * /api/v1/omr/submissions/{batch_id}/submit:
 *   post:
 *     summary: Upload phiếu trả lời (OMR tự động nhận diện sinh viên)
 *     description: |
 *       Teacher upload ảnh phiếu trả lời đã làm. Hệ thống sẽ:
 *       1. Đọc số báo danh từ phiếu (ô đã tô)
 *       2. Match với student trong database
 *       3. Nhận diện và chấm điểm tự động
 *       
 *       Không cần truyền student_id - hệ thống tự động xác định.
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của exam batch
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - answer_sheet
 *             properties:
 *               answer_sheet:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh phiếu trả lời (JPG/PNG) - phải có số báo danh được tô rõ ràng
 *     responses:
 *       201:
 *         description: Upload thành công
 */
router.post('/submissions/:batch_id/submit', authenticate, omrController.submitAnswerSheet);

/**
 * @swagger
 * /api/v1/omr/submissions/{submission_id}:
 *   get:
 *     summary: Xem kết quả submission
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submission_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của submission
 *     responses:
 *       200:
 *         description: Kết quả submission
 */
router.get('/submissions/:submission_id', authenticate, omrController.getSubmissionResult);

/**
 * @swagger
 * /api/v1/omr/exam-batches/{batch_id}/review:
 *   get:
 *     summary: Danh sách submissions cần review
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của exam batch
 *     responses:
 *       200:
 *         description: Danh sách cần review
 */
router.get('/exam-batches/:batch_id/review', authenticate, authorize('TEACHER'), omrController.getSubmissionsNeedReview);

/**
 * @swagger
 * /api/v1/omr/submissions/{submission_id}/review:
 *   patch:
 *     summary: Cập nhật sau review thủ công
 *     tags: [OMR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submission_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID của submission
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               detected_answers:
 *                 type: object
 *               review_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/submissions/:submission_id/review', authenticate, authorize('TEACHER'), omrController.updateSubmissionAfterReview);

/**
 * @swagger
 * /api/v1/omr/templates/blank:
 *   get:
 *     summary: Download template phiếu thi tĩnh (file PDF có sẵn)
 *     tags: [OMR]
 *     description: Tải về file template phiếu thi 50 câu trắc nghiệm. Sinh viên in ra, làm bài, sau đó chụp lại và upload.
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/templates/blank', omrController.downloadBlankTemplate);

module.exports = router;
