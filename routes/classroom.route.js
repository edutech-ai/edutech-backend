const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroom.controller');
const classroomValidator = require('../middlewares/classroom.validator');
const { authenticate } = require('../middlewares/auth');

// ============================================================
// CLASSROOM ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/classrooms:
 *   post:
 *     summary: Tạo lớp học mới
 *     tags: [Classrooms]
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
 *             properties:
 *               name:
 *                 type: string
 *               school_year:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, archived, unactive]
 *     responses:
 *       201:
 *         description: Tạo lớp học thành công
 */
router.post(
  '/',
  authenticate,
  classroomValidator.createClassroom,
  classroomController.createClassroom
);

/**
 * @swagger
 * /api/v1/classrooms:
 *   get:
 *     summary: Lấy danh sách lớp học của giáo viên
 *     tags: [Classrooms]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, unactive]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/',
  authenticate,
  classroomValidator.getClassrooms,
  classroomController.getClassrooms
);

/**
 * @swagger
 * /api/v1/classrooms/{id}:
 *   get:
 *     summary: Lấy thông tin lớp học theo ID
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 */
router.get(
  '/:id',
  authenticate,
  classroomValidator.getClassroomById,
  classroomController.getClassroomById
);

/**
 * @swagger
 * /api/v1/classrooms/{id}:
 *   put:
 *     summary: Cập nhật thông tin lớp học
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *               school_year:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, archived, unactive]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id',
  authenticate,
  classroomValidator.updateClassroom,
  classroomController.updateClassroom
);

/**
 * @swagger
 * /api/v1/classrooms/{id}:
 *   delete:
 *     summary: Xóa lớp học
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
  '/:id',
  authenticate,
  classroomValidator.deleteClassroom,
  classroomController.deleteClassroom
);

// ============================================================
// CLASSROOM-STUDENT ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students:
 *   post:
 *     summary: Tạo học sinh mới và thêm vào lớp
 *     tags: [Classrooms]
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
 *               - full_name
 *               - student_code
 *             properties:
 *               full_name:
 *                 type: string
 *                 description: Họ tên học sinh
 *               student_code:
 *                 type: string
 *                 description: Mã học sinh
 *               phone_number:
 *                 type: string
 *                 description: Số điện thoại học sinh
 *               parent_phone_number:
 *                 type: string
 *                 description: Số điện thoại phụ huynh
 *               is_active:
 *                 type: boolean
 *                 description: Trạng thái hoạt động
 *               status:
 *                 type: string
 *                 enum: [active, completed, dropped]
 *                 description: Trạng thái học sinh trong lớp
 *     responses:
 *       201:
 *         description: Tạo học sinh và thêm vào lớp thành công
 */
router.post(
  '/:classroomId/students',
  authenticate,
  classroomValidator.createStudentAndAddToClassroom,
  classroomController.createStudentAndAddToClassroom
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/add-existing:
 *   post:
 *     summary: Thêm học sinh đã tồn tại vào lớp
 *     tags: [Classrooms]
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
 *             properties:
 *               student_id:
 *                 type: string
 *                 description: ID học sinh đã tồn tại
 *               status:
 *                 type: string
 *                 enum: [active, completed, dropped]
 *                 description: Trạng thái học sinh trong lớp
 *     responses:
 *       201:
 *         description: Thêm học sinh vào lớp thành công
 */
router.post(
  '/:classroomId/students/add-existing',
  authenticate,
  classroomValidator.addStudentToClassroom,
  classroomController.addStudentToClassroom
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students:
 *   get:
 *     summary: Lấy danh sách học sinh trong lớp
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, dropped]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/:classroomId/students',
  authenticate,
  classroomValidator.getClassroomStudents,
  classroomController.getClassroomStudents
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}:
 *   put:
 *     summary: Cập nhật trạng thái học sinh trong lớp
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *       - in: path
 *         name: studentId
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, completed, dropped]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:classroomId/students/:studentId',
  authenticate,
  classroomValidator.updateStudentStatus,
  classroomController.updateStudentStatus
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}:
 *   delete:
 *     summary: Xóa học sinh khỏi lớp
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của học sinh
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
  '/:classroomId/students/:studentId',
  authenticate,
  classroomValidator.removeStudentFromClassroom,
  classroomController.removeStudentFromClassroom
);

// ============================================================
// STUDENT PERFORMANCE ROUTES
// ============================================================

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/performance:
 *   get:
 *     summary: Lấy thông tin học lực của học sinh
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của học sinh
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 */
router.get(
  '/:classroomId/students/:studentId/performance',
  authenticate,
  classroomValidator.getStudentPerformance,
  classroomController.getStudentPerformance
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/students/{studentId}/performance:
 *   put:
 *     summary: Cập nhật thông tin học lực của học sinh
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *       - in: path
 *         name: studentId
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
 *               total_exams:
 *                 type: integer
 *               average_score:
 *                 type: number
 *               subject_performance:
 *                 type: object
 *               strong_topic:
 *                 type: object
 *               weak_topic:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:classroomId/students/:studentId/performance',
  authenticate,
  classroomValidator.updateStudentPerformance,
  classroomController.updateStudentPerformance
);

/**
 * @swagger
 * /api/v1/classrooms/{classroomId}/leaderboard:
 *   get:
 *     summary: Lấy bảng xếp hạng học sinh trong lớp
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lớp học
 *     responses:
 *       200:
 *         description: Lấy bảng xếp hạng thành công
 */
router.get(
  '/:classroomId/leaderboard',
  authenticate,
  classroomController.getClassroomLeaderboard
);

module.exports = router;
