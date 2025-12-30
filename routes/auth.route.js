const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('Invalid role'),
  body('subject')
    .optional()
    .isIn(['TOAN', 'VAN', 'ANH', 'LY', 'HOA', 'SINH', 'SU', 'DIA', 'GDCD', 'TIN', 'CN'])
    .withMessage('Invalid subject')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.get('/profile', authenticate, AuthController.getProfile);

module.exports = router;
