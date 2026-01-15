const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroom.controller');
const classroomValidator = require('../middlewares/classroom.validator');
const { authenticate } = require('../middlewares/auth');

// ============================================================
// STUDENT ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/students:
 *   post:
 *     summary: Tạo học sinh mới
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - student_code
 *             properties:
 *               full_name:
 *                 type: string
 *               student_code:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               parent_phone_number:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tạo học sinh thành công
 */
router.post(
  '/',
  authenticate,
  classroomValidator.createStudent,
  classroomController.createStudent
);

/**
 * @swagger
 * /api/v1/students:
 *   get:
 *     summary: Lấy danh sách học sinh
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc mã học sinh
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/',
  authenticate,
  classroomController.getStudents
);

/**
 * @swagger
 * /api/v1/students/{id}:
 *   get:
 *     summary: Lấy thông tin học sinh theo ID
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của học sinh
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 */
router.get(
  '/:id',
  authenticate,
  classroomValidator.getStudentById,
  classroomController.getStudentById
);

/**
 * @swagger
 * /api/v1/students/{id}:
 *   put:
 *     summary: Cập nhật thông tin học sinh
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của học sinh
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               student_code:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               parent_phone_number:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id',
  authenticate,
  classroomValidator.updateStudent,
  classroomController.updateStudent
);

/**
 * @swagger
 * /api/v1/students/{id}:
 *   delete:
 *     summary: Xóa học sinh
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của học sinh
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
  '/:id',
  authenticate,
  classroomValidator.deleteStudent,
  classroomController.deleteStudent
);

module.exports = router;
