const { body, param, query } = require('express-validator');

// Score Validators
exports.createScore = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  body('student_id')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('score')
    .isFloat({ min: 0 }).withMessage('Điểm phải là số và lớn hơn hoặc bằng 0'),
  body('max_score')
    .optional()
    .isFloat({ min: 0 }).withMessage('Thang điểm phải là số và lớn hơn 0'),
  body('subject')
    .optional()
    .isString().withMessage('Môn học phải là chuỗi'),
  body('exam_name')
    .optional()
    .isString().withMessage('Tên bài kiểm tra phải là chuỗi'),
  body('exam_type')
    .optional()
    .isIn(['quiz', 'test', 'midterm', 'final', 'assignment', 'other'])
    .withMessage('Loại bài kiểm tra không hợp lệ'),
  body('exam_date')
    .isISO8601().withMessage('Ngày kiểm tra không hợp lệ'),
  body('quiz_id')
    .optional({ values: 'falsy' })
    .isUUID().withMessage('ID quiz không hợp lệ'),
  body('notes')
    .optional({ values: 'falsy' })
    .isString().withMessage('Ghi chú phải là chuỗi')
];

exports.updateScore = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  param('scoreId')
    .isUUID().withMessage('ID điểm không hợp lệ'),
  body('score')
    .optional()
    .isFloat({ min: 0 }).withMessage('Điểm phải là số và lớn hơn hoặc bằng 0'),
  body('max_score')
    .optional()
    .isFloat({ min: 0 }).withMessage('Thang điểm phải là số và lớn hơn 0'),
  body('subject')
    .optional()
    .isString().withMessage('Môn học phải là chuỗi'),
  body('exam_name')
    .optional()
    .isString().withMessage('Tên bài kiểm tra phải là chuỗi'),
  body('exam_type')
    .optional()
    .isIn(['quiz', 'test', 'midterm', 'final', 'assignment', 'other'])
    .withMessage('Loại bài kiểm tra không hợp lệ'),
  body('exam_date')
    .optional()
    .isISO8601().withMessage('Ngày kiểm tra không hợp lệ'),
  body('notes')
    .optional()
    .isString().withMessage('Ghi chú phải là chuỗi')
];

// Hand Raise Validators
exports.saveWeeklyHandRaises = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  body('week_start_date')
    .optional()
    .isISO8601().withMessage('Ngày bắt đầu tuần không hợp lệ'),
  body('students')
    .isArray({ min: 1 }).withMessage('Danh sách học sinh phải là mảng và có ít nhất 1 học sinh'),
  body('students.*.student_id')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('students.*.raise_count')
    .isInt({ min: 0 }).withMessage('Số lần giơ tay phải là số nguyên không âm'),
  body('students.*.notes')
    .optional()
    .isString().withMessage('Ghi chú phải là chuỗi')
];

// Performance Validators
exports.updateTeacherNotes = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  param('studentId')
    .isUUID().withMessage('ID học sinh không hợp lệ'),
  body('teacher_notes')
    .isString().withMessage('Ghi chú phải là chuỗi')
];

// Upload Scores XLSX Validator
exports.uploadScoresXLSX = [
  param('classroomId')
    .isUUID().withMessage('ID lớp học không hợp lệ'),
  body('max_score')
    .optional()
    .isFloat({ min: 0 }).withMessage('Thang điểm phải là số và lớn hơn 0'),
  body('subject')
    .notEmpty().withMessage('Môn học không được để trống'),
  body('exam_name')
    .notEmpty().withMessage('Tên bài kiểm tra không được để trống'),
  body('exam_type')
    .isIn(['quiz', 'test', 'midterm', 'final', 'assignment', 'other'])
    .withMessage('Loại bài kiểm tra không hợp lệ'),
  body('exam_date')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Ngày kiểm tra không hợp lệ (định dạng: YYYY-MM-DD)'),
  body('quiz_id')
    .optional({ values: 'falsy' })
    .isUUID().withMessage('ID quiz không hợp lệ')
];
