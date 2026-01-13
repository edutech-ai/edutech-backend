const { body } = require('express-validator');

const createPricePlanValidation = [
    body('plan_name')
        .trim()
        .notEmpty()
        .withMessage('Plan name is required')
        .isLength({ max: 200 })
        .withMessage('Plan name must not exceed 200 characters'),

    body('description')
        .optional()
        .trim(),

    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('discount_percent')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount percent must be between 0 and 100'),

    body('billing_type')
        .notEmpty()
        .withMessage('Billing type is required')
        .isIn(['monthly', 'yearly'])
        .withMessage('Billing type must be either monthly or yearly'),

    body('button_text')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Button text must not exceed 100 characters'),

    body('benefits')
        .optional()
        .isArray()
        .withMessage('Benefits must be an array'),

    body('benefits.*')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Benefit item cannot be empty'),

    body('display_order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive integer')
];

const updatePricePlanValidation = [
    body('plan_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Plan name cannot be empty')
        .isLength({ max: 200 })
        .withMessage('Plan name must not exceed 200 characters'),

    body('description')
        .optional()
        .trim(),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('discount_percent')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount percent must be between 0 and 100'),

    body('billing_type')
        .optional()
        .isIn(['monthly', 'yearly'])
        .withMessage('Billing type must be either monthly or yearly'),

    body('button_text')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Button text must not exceed 100 characters'),

    body('benefits')
        .optional()
        .isArray()
        .withMessage('Benefits must be an array'),

    body('benefits.*')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Benefit item cannot be empty'),

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
    createPricePlanValidation,
    updatePricePlanValidation
};
