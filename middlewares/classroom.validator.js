const { body, param, query } = require('express-validator');

// Classroom Validators
exports.createClassroom = [
  body('name')
    .notEmpty().withMessage('Tên lớp học không được để trống')
    .isLength({ max: 255 }).withMessage('Tên lớp học không được vượt quá 255 ký tự'),
  body('school_year')
    .optional()
    .isLength({ max: 50 }).withMessage('Năm học không được vượt quá 50 ký tự'),
  body('description')
    .optional(),
  body('avatar_url')
    .optional({ checkFalsy: true })
    .isURL().withMessage('URL avatar không hợp lệ'),
  body('status')
    .optional()
    .isIn(['active', 'archived', 'unactive']).withMessage('Trạng thái không hợp lệ')
];

exports.updateClassroom = [
  param('id')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  body('name')
    .optional()
    .isLength({ max: 255 }).withMessage('Tên lớp học không được vượt quá 255 ký tự'),
  body('school_year')
    .optional()
    .isLength({ max: 50 }).withMessage('Năm học không được vượt quá 50 ký tự'),
  body('description')
    .optional(),
  body('avatar_url')
    .optional({ checkFalsy: true })
    .isURL().withMessage('URL avatar không hợp lệ'),
  body('status')
    .optional()
    .isIn(['active', 'archived', 'unactive']).withMessage('Trạng thái không hợp lệ')
];

exports.getClassroomById = [
  param('id')
    .isUUID().withMessage('ID lớp học không hợp lệ')
];

exports.deleteClassroom = [
  param('id')
    .isUUID().withMessage('ID lớp học không hợp lệ')
];

exports.getClassrooms = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Giới hạn phải từ 1 đến 100'),
  query('status')
    .optional()
    .isIn(['active', 'archived', 'unactive']).withMessage('Trạng thái không hợp lệ')
];

// Student Validators
exports.createStudent = [
  body('full_name')
    .notEmpty().withMessage('Họ tên học sinh không được để trống')
    .isLength({ max: 255 }).withMessage('Họ tên không được vượt quá 255 ký tự'),
  body('student_code')
    .notEmpty().withMessage('Mã học sinh không được để trống')
    .isLength({ max: 50 }).withMessage('Mã học sinh không được vượt quá 50 ký tự'),
  body('phone_number')
    .optional()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
  body('parent_phone_number')
    .optional()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phụ huynh không hợp lệ'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean')
];

exports.updateStudent = [
  param('id')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('full_name')
    .optional()
    .isLength({ max: 255 }).withMessage('Họ tên không được vượt quá 255 ký tự'),
  body('student_code')
    .optional()
    .isLength({ max: 50 }).withMessage('Mã học sinh không được vượt quá 50 ký tự'),
  body('phone_number')
    .optional()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
  body('parent_phone_number')
    .optional()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phụ huynh không hợp lệ'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean')
];

exports.getStudentById = [
  param('id')
    .isUUID().withMessage('ID học sinh không hợp lệ')
];

exports.deleteStudent = [
  param('id')
    .isUUID().withMessage('ID học sinh không hợp lệ')
];

// Classroom-Student Validators
exports.addStudentToClassroom = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  body('student_id')
    .notEmpty().withMessage('ID học sinh không được để trống')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'dropped']).withMessage('Trạng thái không hợp lệ')
];

exports.createStudentAndAddToClassroom = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  body('full_name')
    .notEmpty().withMessage('Họ tên học sinh không được để trống')
    .isLength({ max: 255 }).withMessage('Họ tên không được vượt quá 255 ký tự'),
  body('student_code')
    .notEmpty().withMessage('Mã học sinh không được để trống')
    .isLength({ max: 50 }).withMessage('Mã học sinh không được vượt quá 50 ký tự'),
  body('phone_number')
    .optional()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
  body('parent_phone_number')
    .optional()
    .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phụ huynh không hợp lệ'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active phải là boolean'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'dropped']).withMessage('Trạng thái không hợp lệ')
];

exports.removeStudentFromClassroom = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  param('studentId')
    .isUUID().withMessage('ID học sinh không hợp lệ')
];

exports.updateStudentStatus = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  param('studentId')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('status')
    .notEmpty().withMessage('Trạng thái không được để trống')
    .isIn(['active', 'completed', 'dropped']).withMessage('Trạng thái không hợp lệ')
];

exports.getClassroomStudents = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  query('status')
    .optional()
    .isIn(['active', 'completed', 'dropped']).withMessage('Trạng thái không hợp lệ')
];

// Student Performance Validators
exports.updateStudentPerformance = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  param('studentId')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('total_exams')
    .optional()
    .isInt({ min: 0 }).withMessage('Tổng số bài kiểm tra phải là số nguyên không âm'),
  body('average_score')
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage('Điểm trung bình phải từ 0 đến 10'),
  body('subject_performance')
    .optional()
    .isObject().withMessage('subject_performance phải là object'),
  body('strong_topic')
    .optional()
    .isObject().withMessage('strong_topic phải là object'),
  body('weak_topic')
    .optional()
    .isObject().withMessage('weak_topic phải là object')
];

exports.getStudentPerformance = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  param('studentId')
    .isUUID().withMessage('ID học sinh không hợp lệ')
];

// Upload Students Validator
exports.uploadStudentsXLSX = [];

// Upload Students to Classroom Validator
exports.uploadStudentsToClassroom = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ')
];
