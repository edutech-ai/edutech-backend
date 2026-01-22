const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/library.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Library
 *   description: Public library endpoints
 */

/**
 * @swagger
 * /api/v1/library/public:
 *   get:
 *     summary: Get all public library items (documents + quizzes)
 *     tags: [Library]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, quiz, document]
 *         description: Filter by type
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: Filter by grade
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Public library items retrieved successfully
 */
router.get('/public', authenticate, libraryController.getPublicLibrary);

/**
 * @swagger
 * /api/v1/library/public/documents:
 *   get:
 *     summary: Get only public documents
 *     tags: [Library]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public documents retrieved successfully
 */
router.get('/public/documents', authenticate, libraryController.getPublicDocuments);

/**
 * @swagger
 * /api/v1/library/public/quizzes:
 *   get:
 *     summary: Get only public quizzes
 *     tags: [Library]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public quizzes retrieved successfully
 */
router.get('/public/quizzes', authenticate, libraryController.getPublicQuizzes);

/**
 * @swagger
 * /api/v1/library/public/search:
 *   get:
 *     summary: Search in public library
 *     tags: [Library]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, quiz, document]
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/public/search', authenticate, libraryController.searchPublicLibrary);

module.exports = router;
