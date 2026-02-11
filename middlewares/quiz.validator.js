const { body, param, query } = require('express-validator');

// Validation cho tạo quiz
const createQuizValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),

  body('description')
    .optional()
    .trim(),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard']).withMessage('Difficulty must be easy, medium, or hard'),

  body('exam_code')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Exam code must not exceed 50 characters')
    .matches(/^[A-Za-z0-9-_]+$/).withMessage('Exam code can only contain letters, numbers, hyphens, and underscores'),

  body('qr_code')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('QR code URL must not exceed 500 characters'),

  body('status')
    .optional()
    .isIn(['draft', 'public', 'archived']).withMessage('Status must be draft, public, or archived'),

  body('subject')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Subject must not exceed 50 characters'),

  body('grade')
    .optional()
    .isInt({ min: 6, max: 12 }).withMessage('Grade must be an integer between 6 and 12'),

  body('duration')
    .optional()
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer (in minutes)'),

  body('min_attempts')
    .optional()
    .isInt({ min: 1 }).withMessage('min_attempts must be a positive integer'),

  body('max_attempts')
    .optional()
    .custom((value, { req }) => {
      if (value === null) return true; // NULL is allowed for unlimited
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('max_attempts must be a positive integer or null');
      }
      if (req.body.min_attempts && value < req.body.min_attempts) {
        throw new Error('max_attempts must be greater than or equal to min_attempts');
      }
      return true;
    })
];

// Validation cho cập nhật quiz
const updateQuizValidation = [
  param('id')
    .notEmpty().withMessage('Quiz ID is required')
    .isUUID().withMessage('Invalid quiz ID format'),

  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters'),

  body('description')
    .optional()
    .trim(),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard']).withMessage('Difficulty must be easy, medium, or hard'),

  body('exam_code')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Exam code must not exceed 50 characters')
    .matches(/^[A-Za-z0-9-_]+$/).withMessage('Exam code can only contain letters, numbers, hyphens, and underscores'),

  body('qr_code')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('QR code URL must not exceed 500 characters'),

  body('status')
    .optional()
    .isIn(['draft', 'public', 'archived']).withMessage('Status must be draft, public, or archived'),

  body('subject')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Subject must not exceed 50 characters'),

  body('grade')
    .optional()
    .isInt({ min: 6, max: 12 }).withMessage('Grade must be an integer between 6 and 12'),

  body('duration')
    .optional()
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer (in minutes)'),

  body('min_attempts')
    .optional()
    .isInt({ min: 1 }).withMessage('min_attempts must be a positive integer'),

  body('max_attempts')
    .optional()
    .custom((value, { req }) => {
      if (value === null) return true;
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('max_attempts must be a positive integer or null');
      }
      if (req.body.min_attempts && value < req.body.min_attempts) {
        throw new Error('max_attempts must be greater than or equal to min_attempts');
      }
      return true;
    })
];

// Validation cho ID parameter
const quizIdValidation = [
  param('id')
    .notEmpty().withMessage('Quiz ID is required')
    .isUUID().withMessage('Invalid quiz ID format')
];

// Validation cho exam code parameter
const examCodeValidation = [
  param('examCode')
    .notEmpty().withMessage('Exam code is required')
    .trim()
];

// Validation cho query parameters
const quizQueryValidation = [
  query('status')
    .optional()
    .isIn(['draft', 'public', 'archived']).withMessage('Invalid status'),

  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),

  query('subject')
    .optional()
    .trim(),

  query('grade')
    .optional()
    .isInt({ min: 6, max: 12 }).withMessage('Grade must be an integer between 6 and 12'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const updateVisibilityValidator = [
  body('visibility')
    .notEmpty()
    .withMessage('Visibility is required')
    .isIn(['private', 'community'])
    .withMessage('Visibility must be either "private" or "community"')
];

module.exports = {
  createQuizValidation,
  updateQuizValidation,
  quizIdValidation,
  examCodeValidation,
  quizQueryValidation,
  updateVisibilityValidator
};
