const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middlewares/auth');
const { checkStorageQuota } = require('../middlewares/quota');
const { upload } = require('../utils/cloudinary');
const {
  uploadDocumentValidator,
  updateDocumentValidator,
  getDocumentValidator,
  getDocumentsValidator,
  moveDocumentValidator,
  shareDocumentValidator,
  deleteDocumentValidator
} = require('../middlewares/document.validator');

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management endpoints
 */

/**
 * @swagger
 * /api/v1/documents:
 *   get:
 *     summary: Get list of documents with filters
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: is_public
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 */
router.get('/', authenticate, getDocumentsValidator, documentController.getDocuments);

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Get document details
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 */
router.get('/:id', authenticate, getDocumentValidator, documentController.getDocumentById);

/**
 * @swagger
 * /api/v1/documents/upload:
 *   post:
 *     summary: Upload new document to Cloudinary
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - name
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               folder_id:
 *                 type: string
 *               is_public:
 *                 type: boolean
 *               subject:
 *                 type: string
 *               grade:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */
router.post('/upload', authenticate, upload.single('file'), checkStorageQuota, uploadDocumentValidator, documentController.uploadDocument);

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   put:
 *     summary: Update document metadata
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               grade:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Document updated successfully
 */
router.put('/:id', authenticate, updateDocumentValidator, documentController.updateDocument);

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   delete:
 *     summary: Delete document from database and Cloudinary
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 */
router.delete('/:id', authenticate, deleteDocumentValidator, documentController.deleteDocument);

/**
 * @swagger
 * /api/v1/documents/{id}/move:
 *   post:
 *     summary: Move document to different folder
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folder_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document moved successfully
 */
router.post('/:id/move', authenticate, moveDocumentValidator, documentController.moveDocument);

/**
 * @swagger
 * /api/v1/documents/{id}/share:
 *   post:
 *     summary: Toggle document public/private status
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_public
 *             properties:
 *               is_public:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document sharing status updated successfully
 */
router.post('/:id/share', authenticate, shareDocumentValidator, documentController.shareDocument);

module.exports = router;
