const express = require('express');
const router = express.Router();
const multer = require('multer');
const scoreController = require('../controllers/score.controller');
const handRaiseController = require('../controllers/handRaise.controller');
const performanceController = require('../controllers/performance.controller');
const performanceValidator = require('../middlewares/performance.validator');
const { authenticate } = require('../middlewares/auth');

// Cấu hình multer để xử lý upload file
const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// SCORES ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/scores:
 *   post:
 *     summary: Thêm điểm mới cho học sinh
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *               - score
 *               - exam_date
 *             properties:
 *               student_id:
 *                 type: string
 *               score:
 *                 type: number
 *               max_score:
 *                 type: number
 *                 default: 10
 *               subject:
 *                 type: string
 *               exam_name:
 *                 type: string
 *               exam_type:
 *                 type: string
 *                 enum: [quiz, test, midterm, final, assignment, other]
 *               exam_date:
 *                 type: string
 *                 format: date
 *               quiz_id:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm điểm thành công
 */
router.post(
  '/classrooms/:classroomId/scores',
  authenticate,
  performanceValidator.createScore,
  scoreController.createScore
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/scores:
 *   get:
 *     summary: Lấy danh sách điểm của lớp
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: exam_type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/classrooms/:classroomId/scores',
  authenticate,
  scoreController.getClassroomScores
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/scores:
 *   get:
 *     summary: Lấy điểm của một học sinh
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy điểm thành công
 */
router.get(
  '/classrooms/:classroomId/students/:studentId/scores',
  authenticate,
  scoreController.getStudentScores
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/scores/{scoreId}:
 *   put:
 *     summary: Cập nhật điểm
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: scoreId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/classrooms/:classroomId/scores/:scoreId',
  authenticate,
  performanceValidator.updateScore,
  scoreController.updateScore
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/scores/{scoreId}:
 *   delete:
 *     summary: Xóa điểm
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: scoreId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
  '/classrooms/:classroomId/scores/:scoreId',
  authenticate,
  scoreController.deleteScore
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/scores/upload:
 *   post:
 *     summary: Upload file XLSX điểm học sinh hàng loạt
 *     description: Upload file Excel chứa danh sách điểm của nhiều học sinh. File phải có các cột student_code, student_name, score, notes (optional). Ngày kiểm tra (exam_date) có thể nhập qua form hoặc để trống (mặc định là ngày hiện tại).
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - subject
 *               - exam_name
 *               - exam_type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File XLSX chứa điểm
 *               quiz_id:
 *                 type: string
 *                 description: ID của quiz (optional)
 *               max_score:
 *                 type: number
 *                 description: Thang điểm tối đa (mặc định 10)
 *               subject:
 *                 type: string
 *                 description: Môn học
 *               exam_name:
 *                 type: string
 *                 description: Tên bài kiểm tra
 *               exam_type:
 *                 type: string
 *                 enum: [quiz, test, midterm, final, assignment, other]
 *                 description: Loại bài kiểm tra
 *               exam_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày kiểm tra (định dạng YYYY-MM-DD, optional - mặc định là ngày hiện tại)
 *     responses:
 *       200:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successCount:
 *                       type: integer
 *                     errorCount:
 *                       type: integer
 *                     success:
 *                       type: array
 *                     errors:
 *                       type: array
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền
 */
router.post(
  '/classrooms/:classroomId/scores/upload',
  authenticate,
  upload.single('file'),
  performanceValidator.uploadScoresXLSX,
  scoreController.uploadScoresXLSX
);

// ============================================================
// HAND RAISES ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/hand-raises/batch:
 *   post:
 *     summary: Batch cập nhật giơ tay cho nhiều học sinh (cuối giờ)
 *     description: Frontend track số lần giơ tay trong giờ học, cuối giờ gọi API này 1 lần để cộng thêm vào total. Giảm load server.
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - students
 *             properties:
 *               students:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - student_id
 *                     - add_count
 *                   properties:
 *                     student_id:
 *                       type: string
 *                       format: uuid
 *                     add_count:
 *                       type: integer
 *                       minimum: 0
 *                       description: Số lần giơ tay trong buổi học (sẽ cộng thêm vào total)
 *             example:
 *               students:
 *                 - student_id: "019bf979-67fc-76e7-8604-99d7e12e9693"
 *                   add_count: 5
 *                 - student_id: "019bf980-0590-75ed-82ef-71d7fdad79ed"
 *                   add_count: 3
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successCount:
 *                       type: integer
 *                     errorCount:
 *                       type: integer
 *                     success:
 *                       type: array
 *                     errors:
 *                       type: array
 */
router.post(
  '/classrooms/:classroomId/hand-raises/batch',
  authenticate,
  performanceValidator.batchUpdateHandRaises,
  handRaiseController.batchUpdateHandRaises
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/hand-raises:
 *   put:
 *     summary: Cập nhật tổng số lần giơ tay (thủ công)
 *     description: Dùng để sửa lại tổng số lần giơ tay nếu cần (ví dụ sửa lỗi nhập)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - total_hand_raises
 *             properties:
 *               total_hand_raises:
 *                 type: integer
 *                 minimum: 0
 *                 description: Tổng số lần giơ tay mới (ghi đè total cũ)
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/classrooms/:classroomId/students/:studentId/hand-raises',
  authenticate,
  performanceValidator.updateHandRaiseTotal,
  handRaiseController.updateHandRaiseTotal
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/hand-raises:
 *   get:
 *     summary: Lấy danh sách giơ tay của tất cả học sinh trong lớp
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/classrooms/:classroomId/hand-raises',
  authenticate,
  handRaiseController.getClassroomHandRaises
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/hand-raises:
 *   get:
 *     summary: Lấy thông tin giơ tay của một học sinh
 *     description: Trả về tổng số lần, avg per week, first/last raise date
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 */
router.get(
  '/classrooms/:classroomId/students/:studentId/hand-raises',
  authenticate,
  handRaiseController.getStudentHandRaise
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/hand-raises:
 *   delete:
 *     summary: Xóa dữ liệu giơ tay của học sinh (reset về 0)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
  '/classrooms/:classroomId/students/:studentId/hand-raises',
  authenticate,
  handRaiseController.deleteHandRaise
);

// ============================================================
// PERFORMANCE ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/performance:
 *   get:
 *     summary: Lấy hiệu suất của một học sinh
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy hiệu suất thành công
 */
router.get(
  '/classrooms/:classroomId/students/:studentId/performance',
  authenticate,
  performanceController.getStudentPerformance
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/performance:
 *   get:
 *     summary: Lấy hiệu suất của tất cả học sinh trong lớp
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy hiệu suất thành công
 */
router.get(
  '/classrooms/:classroomId/performance',
  authenticate,
  performanceController.getClassroomPerformance
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/performance/notes:
 *   put:
 *     summary: Cập nhật ghi chú của giáo viên
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacher_notes
 *             properties:
 *               teacher_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/classrooms/:classroomId/students/:studentId/performance/notes',
  authenticate,
  performanceValidator.updateTeacherNotes,
  performanceController.updateTeacherNotes
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/performance/recalculate:
 *   post:
 *     summary: Tính lại hiệu suất cho một học sinh
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tính lại thành công
 */
router.post(
  '/classrooms/:classroomId/students/:studentId/performance/recalculate',
  authenticate,
  performanceController.recalculateStudentPerformance
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/performance/recalculate:
 *   post:
 *     summary: Tính lại hiệu suất cho tất cả học sinh trong lớp
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tính lại thành công
 */
router.post(
  '/classrooms/:classroomId/performance/recalculate',
  authenticate,
  performanceController.recalculateAllPerformance
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/leaderboard:
 *   get:
 *     summary: Lấy bảng xếp hạng lớp học
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: order_by
 *         schema:
 *           type: string
 *           enum: [score, participation, overall]
 *           default: overall
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lấy bảng xếp hạng thành công
 */
router.get(
  '/classrooms/:classroomId/leaderboard',
  authenticate,
  performanceController.getLeaderboard
);

module.exports = router;
