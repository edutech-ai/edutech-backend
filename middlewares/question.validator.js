const { body, param, query } = require('express-validator');

// Validation cho tạo câu hỏi
const createQuestionValidation = [
  body('quiz_id')
    .notEmpty().withMessage('Quiz ID is required')
    .isUUID().withMessage('Invalid quiz ID format'),
  
  body('document_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value && value !== '') {
        // Only validate UUID if value is not empty
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          throw new Error('Invalid document ID format');
        }
      }
      return true;
    }),
  
  body('content')
    .trim()
    .notEmpty().withMessage('Question content is required'),
  
  body('options')
    .optional()
    .isArray().withMessage('Options must be an array'),
  
  body('correct_answer')
    .notEmpty().withMessage('Correct answer is required'),
  
  body('type')
    .optional()
    .isIn(['MCQ', 'ESSAY', 'TRUE_FALSE', 'MULTIPLE_ANSWER']).withMessage('Invalid question type'),
  
  body('point')
    .optional()
    .isFloat({ min: 0 }).withMessage('Point must be a positive number'),
  
  body('explanation')
    .optional()
    .trim()
];

// Validation cho bulk create
const bulkCreateQuestionsValidation = [
  body('quiz_id')
    .notEmpty().withMessage('Quiz ID is required')
    .isUUID().withMessage('Invalid quiz ID format'),
  
  body('questions')
    .isArray({ min: 1 }).withMessage('Questions must be a non-empty array'),
  
  body('questions.*.content')
    .trim()
    .notEmpty().withMessage('Question content is required'),
  
  body('questions.*.correct_answer')
    .notEmpty().withMessage('Correct answer is required'),
  
  body('questions.*.type')
    .optional()
    .isIn(['MCQ', 'ESSAY', 'TRUE_FALSE', 'MULTIPLE_ANSWER']).withMessage('Invalid question type'),
  
  body('questions.*.point')
    .optional()
    .isFloat({ min: 0 }).withMessage('Point must be a positive number')
];

// Validation cho cập nhật câu hỏi
const updateQuestionValidation = [
  param('id')
    .notEmpty().withMessage('Question ID is required')
    .isUUID().withMessage('Invalid question ID format'),
  
  body('content')
    .optional()
    .trim()
    .notEmpty().withMessage('Question content cannot be empty'),
  
  body('options')
    .optional()
    .isArray().withMessage('Options must be an array'),
  
  body('correct_answer')
    .optional(),
  
  body('type')
    .optional()
    .isIn(['MCQ', 'ESSAY', 'TRUE_FALSE', 'MULTIPLE_ANSWER']).withMessage('Invalid question type'),
  
  body('point')
    .optional()
    .isFloat({ min: 0 }).withMessage('Point must be a positive number'),
  
  body('explanation')
    .optional()
    .trim(),
  
  body('document_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value && value !== '') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          throw new Error('Invalid document ID format');
        }
      }
      return true;
    })
];

// Validation cho ID parameter
const questionIdValidation = [
  param('id')
    .notEmpty().withMessage('Question ID is required')
    .isUUID().withMessage('Invalid question ID format')
];

// Validation cho quiz ID parameter
const quizIdParamValidation = [
  param('quizId')
    .notEmpty().withMessage('Quiz ID is required')
    .isUUID().withMessage('Invalid quiz ID format')
];

// Validation cho document ID parameter
const documentIdParamValidation = [
  param('documentId')
    .notEmpty().withMessage('Document ID is required')
    .isUUID().withMessage('Invalid document ID format')
];

// Validation cho query parameters
const questionQueryValidation = [
  query('includeAnswers')
    .optional()
    .isIn(['true', 'false']).withMessage('includeAnswers must be true or false')
];

module.exports = {
  createQuestionValidation,
  bulkCreateQuestionsValidation,
  updateQuestionValidation,
  questionIdValidation,
  quizIdParamValidation,
  documentIdParamValidation,
  questionQueryValidation
};
