const { body } = require('express-validator');

const createQuizWithQuestionsValidator = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Tên đề thi phải có độ dài tối đa 255 ký tự'),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả phải có độ dài tối đa 2000 ký tự'),

  body('subject')
    .notEmpty()
    .withMessage('Môn học là bắt buộc')
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Môn học phải là chuỗi ký tự với độ dài tối đa 100 ký tự'),
  body('grade')
    .notEmpty()
    .withMessage('Lớp là bắt buộc')
    .isInt({ min: 1, max: 12 })
    .withMessage('Lớp phải nằm trong khoảng từ 1 đến 12'),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Thời lượng phải nằm trong khoảng từ 1 đến 480 phút'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Độ khó phải là: dễ, trung bình, hoặc khó'),

  body('status')
    .optional()
    .isIn(['draft', 'public', 'private'])
    .withMessage('Trạng thái phải là: nháp, công khai, hoặc riêng tư'),

  body('topic')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Chủ đề phải có độ dài tối đa 500 ký tự'),

  // for MVP, max is 25
  body('numberOfQuestions')
    .optional()
    .isInt({ min: 1, max: 25 })
    .withMessage('Số lượng câu hỏi phải nằm trong khoảng từ 1 đến 25'),

  body('questionTypes')
    .optional()
    .isArray()
    .withMessage('questionTypes phải là một mảng'),

  body('customPrompt')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('customPrompt must be max 5000 characters'),

  body('quizMatrix')
    .optional()
    .isObject()
    .withMessage('quizMatrix must be an object'),
];

const analyzeQuizValidator = [
  body('quiz_id')
    .notEmpty()
    .withMessage('quiz_id là bắt buộc')
    .isString()
    .trim()
    .withMessage('quiz_id phải là chuỗi UUID hợp lệ'),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Mô tả bổ sung phải có độ dài tối đa 2000 ký tự'),
];

module.exports = {
  createQuizWithQuestionsValidator,
  analyzeQuizValidator,
};
