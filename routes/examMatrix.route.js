const express = require('express');
const ExamMatrixController = require('../controllers/examMatrix.controller');
const { authenticate } = require('../middlewares/auth');
const {
    createMatrixValidation,
    updateMatrixValidation,
    matrixIdValidation,
    chapterIdValidation,
    addChapterValidation,
    updateChapterValidation,
    matrixQueryValidation
} = require('../middlewares/examMatrix.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Exam Matrices
 *   description: Quản lý ma trận đề thi
 */

/**
 * @swagger
 * /api/v1/exam-matrices:
 *   post:
 *     summary: Tạo ma trận đề thi mới (Teacher only)
 *     tags: [Exam Matrices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subject
 *               - grade
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ma trận Toán 10 - Học kỳ 1
 *               subject:
 *                 type: string
 *                 example: Toán
 *               grade:
 *                 type: integer
 *                 example: 10
 *               description:
 *                 type: string
 *                 example: Ma trận đề thi học kỳ 1 môn Toán lớp 10
 *               chapters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - chapter_name
 *                   properties:
 *                     chapter_name:
 *                       type: string
 *                       example: Mệnh đề, tập hợp
 *                     recognition_count:
 *                       type: integer
 *                       example: 2
 *                     recognition_score:
 *                       type: number
 *                       example: 1.0
 *                     comprehension_count:
 *                       type: integer
 *                       example: 1
 *                     comprehension_score:
 *                       type: number
 *                       example: 1.5
 *                     application_count:
 *                       type: integer
 *                       example: 1
 *                     application_score:
 *                       type: number
 *                       example: 2.0
 *                     high_application_count:
 *                       type: integer
 *                       example: 0
 *                     high_application_score:
 *                       type: number
 *                       example: 0
 *                     order_index:
 *                       type: integer
 *                       example: 0
 *     responses:
 *       201:
 *         description: Ma trận được tạo thành công
 *       400:
 *         description: Lỗi validation
 *       401:
 *         description: Chưa xác thực
 */
router.post('/', authenticate, createMatrixValidation, ExamMatrixController.createMatrix);

/**
 * @swagger
 * /api/v1/exam-matrices/my-matrices:
 *   get:
 *     summary: Lấy danh sách ma trận của giáo viên (Teacher only)
 *     tags: [Exam Matrices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Lọc theo môn học
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: Lọc theo lớp
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên ma trận
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
 *         description: Danh sách ma trận
 *       401:
 *         description: Chưa xác thực
 */
router.get('/my-matrices', authenticate, matrixQueryValidation, ExamMatrixController.getMyMatrices);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}:
 *   get:
 *     summary: Lấy chi tiết ma trận theo ID
 *     tags: [Exam Matrices]
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
 *         description: Chi tiết ma trận
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy ma trận
 */
router.get('/:id', authenticate, matrixIdValidation, ExamMatrixController.getMatrixById);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}:
 *   put:
 *     summary: Cập nhật ma trận (Teacher only - Owner)
 *     tags: [Exam Matrices]
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
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               grade:
 *                 type: integer
 *               description:
 *                 type: string
 *               chapters:
 *                 type: array
 *                 description: Danh sách chương (sẽ thay thế toàn bộ chương hiện tại)
 *                 items:
 *                   type: object
 *                   required:
 *                     - chapter_name
 *                   properties:
 *                     chapter_name:
 *                       type: string
 *                     recognition_count:
 *                       type: integer
 *                     recognition_score:
 *                       type: number
 *                     comprehension_count:
 *                       type: integer
 *                     comprehension_score:
 *                       type: number
 *                     application_count:
 *                       type: integer
 *                     application_score:
 *                       type: number
 *                     high_application_count:
 *                       type: integer
 *                     high_application_score:
 *                       type: number
 *                     order_index:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Ma trận được cập nhật thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy ma trận
 */
router.put('/:id', authenticate, updateMatrixValidation, ExamMatrixController.updateMatrix);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}:
 *   delete:
 *     summary: Xóa ma trận (Teacher only - Owner)
 *     tags: [Exam Matrices]
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
 *         description: Ma trận được xóa thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy ma trận
 */
router.delete('/:id', authenticate, matrixIdValidation, ExamMatrixController.deleteMatrix);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}/chapters:
 *   get:
 *     summary: Lấy danh sách chương của ma trận
 *     tags: [Exam Matrices]
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
 *         description: Danh sách chương
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy ma trận
 */
router.get('/:id/chapters', authenticate, matrixIdValidation, ExamMatrixController.getChapters);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}/chapters:
 *   post:
 *     summary: Thêm chương mới vào ma trận
 *     tags: [Exam Matrices]
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
 *             required:
 *               - chapter_name
 *             properties:
 *               chapter_name:
 *                 type: string
 *                 example: Hàm số bậc nhất và bậc hai
 *               recognition_count:
 *                 type: integer
 *                 example: 2
 *               recognition_score:
 *                 type: number
 *                 example: 1.0
 *               comprehension_count:
 *                 type: integer
 *                 example: 2
 *               comprehension_score:
 *                 type: number
 *                 example: 1.5
 *               application_count:
 *                 type: integer
 *                 example: 1
 *               application_score:
 *                 type: number
 *                 example: 2.0
 *               high_application_count:
 *                 type: integer
 *                 example: 1
 *               high_application_score:
 *                 type: number
 *                 example: 2.5
 *               order_index:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Chương được thêm thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy ma trận
 */
router.post('/:id/chapters', authenticate, addChapterValidation, ExamMatrixController.addChapter);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}/chapters/{chapterId}:
 *   put:
 *     summary: Cập nhật chương
 *     tags: [Exam Matrices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: chapterId
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
 *               chapter_name:
 *                 type: string
 *               recognition_count:
 *                 type: integer
 *               recognition_score:
 *                 type: number
 *               comprehension_count:
 *                 type: integer
 *               comprehension_score:
 *                 type: number
 *               application_count:
 *                 type: integer
 *               application_score:
 *                 type: number
 *               high_application_count:
 *                 type: integer
 *               high_application_score:
 *                 type: number
 *               order_index:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Chương được cập nhật thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy chương
 */
router.put('/:id/chapters/:chapterId', authenticate, updateChapterValidation, ExamMatrixController.updateChapter);

/**
 * @swagger
 * /api/v1/exam-matrices/{id}/chapters/{chapterId}:
 *   delete:
 *     summary: Xóa chương
 *     tags: [Exam Matrices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chương được xóa thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy chương
 */
router.delete('/:id/chapters/:chapterId', authenticate, chapterIdValidation, ExamMatrixController.deleteChapter);

module.exports = router;
