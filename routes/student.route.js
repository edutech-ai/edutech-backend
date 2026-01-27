const express = require('express');
const router = express.Router();
const multer = require('multer');
const classroomController = require('../controllers/classroom.controller');
const classroomValidator = require('../middlewares/classroom.validator');
const { authenticate } = require('../middlewares/auth');

// Cấu hình multer để upload file
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Chỉ chấp nhận file xlsx, xls
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'));
    }
  }
});

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
 * /api/v1/students/upload:
 *   post:
 *     summary: Upload danh sách học sinh từ file XLSX
 *     tags: [Students]
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
 *                 description: File Excel (.xlsx hoặc .xls) chứa danh sách học sinh. Các cột bắt buộc - student_code (mã học sinh), full_name (họ tên), phone (số điện thoại - tùy chọn), parent_phone (số điện thoại phụ huynh - tùy chọn)
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
 *                       type: number
 *                     successCount:
 *                       type: number
 *                     errorCount:
 *                       type: number
 *                     success:
 *                       type: array
 *                       items:
 *                         type: object
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Lỗi validation hoặc file không hợp lệ
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  classroomValidator.uploadStudentsXLSX,
  classroomController.uploadStudentsXLSX
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
