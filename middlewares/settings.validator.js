const { body } = require('express-validator');

const createSubscriptionPlanValidation = [
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Code is required')
        .isLength({ max: 50 })
        .withMessage('Code must not exceed 50 characters'),

    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ max: 255 })
        .withMessage('Name must not exceed 255 characters'),

    body('description')
        .optional()
        .trim(),

    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('currency')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Currency must not exceed 10 characters'),

    body('durationDays')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Duration days must be a positive integer'),

    body('maxClasses')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Max classes must be a non-negative integer'),

    body('maxQuizzesPerMonth')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Max quizzes per month must be a non-negative integer'),

    body('maxStorageMb')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Max storage MB must be a non-negative integer'),

    body('hasAdvancedAi')
        .optional()
        .isBoolean()
        .withMessage('Has advanced AI must be a boolean'),

    body('features')
        .optional()
        .isArray()
        .withMessage('Features must be an array'),

    body('features.*')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Feature item cannot be empty'),

    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive integer')
];

const updateSubscriptionPlanValidation = [
    body('code')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Code cannot be empty')
        .isLength({ max: 50 })
        .withMessage('Code must not exceed 50 characters'),

    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Name cannot be empty')
        .isLength({ max: 255 })
        .withMessage('Name must not exceed 255 characters'),

    body('description')
        .optional()
        .trim(),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('currency')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Currency must not exceed 10 characters'),

    body('durationDays')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Duration days must be a positive integer'),

    body('maxClasses')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Max classes must be a non-negative integer'),

    body('maxQuizzesPerMonth')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Max quizzes per month must be a non-negative integer'),

    body('maxStorageMb')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Max storage MB must be a non-negative integer'),

    body('hasAdvancedAi')
        .optional()
        .isBoolean()
        .withMessage('Has advanced AI must be a boolean'),

    body('features')
        .optional()
        .isArray()
        .withMessage('Features must be an array'),

    body('features.*')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Feature item cannot be empty'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('Is active must be a boolean'),

    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive integer')
];

// FAQ Validations
const createFAQValidation = [
    body('question')
        .trim()
        .notEmpty()
        .withMessage('Question is required'),

    body('answer')
        .trim()
        .notEmpty()
        .withMessage('Answer is required'),

    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category must not exceed 100 characters'),

    body('display_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive integer')
];

const updateFAQValidation = [
    body('question')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Question cannot be empty'),

    body('answer')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Answer cannot be empty'),

    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category must not exceed 100 characters'),

    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),

    body('display_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive integer')
];

module.exports = {
    createSubscriptionPlanValidation,
    updateSubscriptionPlanValidation,
    createFAQValidation,
    updateFAQValidation
};
