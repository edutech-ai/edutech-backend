const { body, param, query } = require('express-validator');

const createMatrixValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Tên ma trận là bắt buộc')
        .isLength({ max: 255 }).withMessage('Tên ma trận không được vượt quá 255 ký tự'),

    body('subject')
        .trim()
        .notEmpty().withMessage('Môn học là bắt buộc')
        .isLength({ max: 50 }).withMessage('Môn học không được vượt quá 50 ký tự'),

    body('grade')
        .notEmpty().withMessage('Lớp là bắt buộc')
        .isInt({ min: 1, max: 12 }).withMessage('Lớp phải là số nguyên từ 1 đến 12'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Mô tả không được vượt quá 1000 ký tự'),

    body('chapters')
        .optional()
        .isArray().withMessage('Danh sách chương phải là một mảng'),

    body('chapters.*.chapter_name')
        .if(body('chapters').exists())
        .trim()
        .notEmpty().withMessage('Tên chương là bắt buộc')
        .isLength({ max: 255 }).withMessage('Tên chương không được vượt quá 255 ký tự'),

    body('chapters.*.recognition_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu nhận biết phải là số nguyên không âm'),

    body('chapters.*.recognition_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm nhận biết phải là số không âm'),

    body('chapters.*.comprehension_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu thông hiểu phải là số nguyên không âm'),

    body('chapters.*.comprehension_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm thông hiểu phải là số không âm'),

    body('chapters.*.application_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng phải là số nguyên không âm'),

    body('chapters.*.application_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng phải là số không âm'),

    body('chapters.*.high_application_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng cao phải là số nguyên không âm'),

    body('chapters.*.high_application_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng cao phải là số không âm'),

    body('chapters.*.order_index')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Thứ tự chương phải là số nguyên không âm')
];

const updateMatrixValidation = [
    param('id')
        .notEmpty().withMessage('ID ma trận là bắt buộc')
        .isUUID().withMessage('Định dạng ID ma trận không hợp lệ'),

    body('name')
        .optional()
        .trim()
        .notEmpty().withMessage('Tên ma trận không được để trống')
        .isLength({ max: 255 }).withMessage('Tên ma trận không được vượt quá 255 ký tự'),

    body('subject')
        .optional()
        .trim()
        .notEmpty().withMessage('Môn học không được để trống')
        .isLength({ max: 50 }).withMessage('Môn học không được vượt quá 50 ký tự'),

    body('grade')
        .optional()
        .isInt({ min: 1, max: 12 }).withMessage('Lớp phải là số nguyên từ 1 đến 12'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Mô tả không được vượt quá 1000 ký tự'),

    body('chapters')
        .optional()
        .isArray().withMessage('Danh sách chương phải là một mảng'),

    body('chapters.*.chapter_name')
        .if(body('chapters').exists())
        .trim()
        .notEmpty().withMessage('Tên chương là bắt buộc')
        .isLength({ max: 255 }).withMessage('Tên chương không được vượt quá 255 ký tự'),

    body('chapters.*.recognition_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu nhận biết phải là số nguyên không âm'),

    body('chapters.*.recognition_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm nhận biết phải là số không âm'),

    body('chapters.*.comprehension_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu thông hiểu phải là số nguyên không âm'),

    body('chapters.*.comprehension_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm thông hiểu phải là số không âm'),

    body('chapters.*.application_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng phải là số nguyên không âm'),

    body('chapters.*.application_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng phải là số không âm'),

    body('chapters.*.high_application_count')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng cao phải là số nguyên không âm'),

    body('chapters.*.high_application_score')
        .if(body('chapters').exists())
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng cao phải là số không âm'),

    body('chapters.*.order_index')
        .if(body('chapters').exists())
        .optional()
        .isInt({ min: 0 }).withMessage('Thứ tự chương phải là số nguyên không âm')
];

// Validation cho ID parameter
const matrixIdValidation = [
    param('id')
        .notEmpty().withMessage('ID ma trận là bắt buộc')
        .isUUID().withMessage('Định dạng ID ma trận không hợp lệ')
];

// Validation cho chapter ID parameter
const chapterIdValidation = [
    param('id')
        .notEmpty().withMessage('ID ma trận là bắt buộc')
        .isUUID().withMessage('Định dạng ID ma trận không hợp lệ'),

    param('chapterId')
        .notEmpty().withMessage('ID chương là bắt buộc')
        .isUUID().withMessage('Định dạng ID chương không hợp lệ')
];

// Validation cho thêm chương
const addChapterValidation = [
    param('id')
        .notEmpty().withMessage('ID ma trận là bắt buộc')
        .isUUID().withMessage('Định dạng ID ma trận không hợp lệ'),

    body('chapter_name')
        .trim()
        .notEmpty().withMessage('Tên chương là bắt buộc')
        .isLength({ max: 255 }).withMessage('Tên chương không được vượt quá 255 ký tự'),

    body('recognition_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu nhận biết phải là số nguyên không âm'),

    body('recognition_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm nhận biết phải là số không âm'),

    body('comprehension_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu thông hiểu phải là số nguyên không âm'),

    body('comprehension_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm thông hiểu phải là số không âm'),

    body('application_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng phải là số nguyên không âm'),

    body('application_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng phải là số không âm'),

    body('high_application_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng cao phải là số nguyên không âm'),

    body('high_application_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng cao phải là số không âm'),

    body('order_index')
        .optional()
        .isInt({ min: 0 }).withMessage('Thứ tự chương phải là số nguyên không âm')
];

// Validation cho cập nhật chương
const updateChapterValidation = [
    param('id')
        .notEmpty().withMessage('ID ma trận là bắt buộc')
        .isUUID().withMessage('Định dạng ID ma trận không hợp lệ'),

    param('chapterId')
        .notEmpty().withMessage('ID chương là bắt buộc')
        .isUUID().withMessage('Định dạng ID chương không hợp lệ'),

    body('chapter_name')
        .optional()
        .trim()
        .notEmpty().withMessage('Tên chương không được để trống')
        .isLength({ max: 255 }).withMessage('Tên chương không được vượt quá 255 ký tự'),

    body('recognition_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu nhận biết phải là số nguyên không âm'),

    body('recognition_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm nhận biết phải là số không âm'),

    body('comprehension_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu thông hiểu phải là số nguyên không âm'),

    body('comprehension_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm thông hiểu phải là số không âm'),

    body('application_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng phải là số nguyên không âm'),

    body('application_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng phải là số không âm'),

    body('high_application_count')
        .optional()
        .isInt({ min: 0 }).withMessage('Số câu vận dụng cao phải là số nguyên không âm'),

    body('high_application_score')
        .optional()
        .isFloat({ min: 0 }).withMessage('Điểm vận dụng cao phải là số không âm'),

    body('order_index')
        .optional()
        .isInt({ min: 0 }).withMessage('Thứ tự chương phải là số nguyên không âm')
];

// Validation cho query parameters
const matrixQueryValidation = [
    query('subject')
        .optional()
        .trim(),

    query('grade')
        .optional()
        .isInt({ min: 1, max: 12 }).withMessage('Lớp phải là số nguyên từ 1 đến 12'),

    query('search')
        .optional()
        .trim(),

    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Trang phải là số nguyên dương'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Giới hạn phải từ 1 đến 100')
];

module.exports = {
    createMatrixValidation,
    updateMatrixValidation,
    matrixIdValidation,
    chapterIdValidation,
    addChapterValidation,
    updateChapterValidation,
    matrixQueryValidation
};
