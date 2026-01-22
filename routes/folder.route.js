const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folder.controller');
const { authenticate } = require('../middlewares/auth');
const {
  createFolderValidator,
  updateFolderValidator,
  moveFolderValidator,
  getFolderValidator,
  getFoldersValidator,
  deleteFolderValidator
} = require('../middlewares/folder.validator');

/**
 * @swagger
 * tags:
 *   name: Folders
 *   description: Folder management endpoints
 */

/**
 * @swagger
 * /api/v1/folders:
 *   get:
 *     summary: Get folders by parent_id
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *         description: Parent folder ID (null for root folders)
 *     responses:
 *       200:
 *         description: Folders retrieved successfully
 */
router.get('/', authenticate, getFoldersValidator, folderController.getFolders);

/**
 * @swagger
 * /api/v1/folders/tree:
 *   get:
 *     summary: Get complete folder tree
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Folder tree retrieved successfully
 */
router.get('/tree', authenticate, folderController.getFolderTree);

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   get:
 *     summary: Get folder details
 *     tags: [Folders]
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
 *         description: Folder retrieved successfully
 */
router.get('/:id', authenticate, getFolderValidator, folderController.getFolderById);

/**
 * @swagger
 * /api/v1/folders/{id}/path:
 *   get:
 *     summary: Get breadcrumb path from root to folder
 *     tags: [Folders]
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
 *         description: Folder path retrieved successfully
 */
router.get('/:id/path', authenticate, getFolderValidator, folderController.getFolderPath);

/**
 * @swagger
 * /api/v1/folders/{id}/children:
 *   get:
 *     summary: Get direct children folders
 *     tags: [Folders]
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
 *         description: Children folders retrieved successfully
 */
router.get('/:id/children', authenticate, getFolderValidator, folderController.getFolderChildren);

/**
 * @swagger
 * /api/v1/folders/{id}/items:
 *   get:
 *     summary: Get all items (folders + documents) in folder
 *     tags: [Folders]
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
 *         description: Folder items retrieved successfully
 */
router.get('/:id/items', authenticate, getFolderValidator, folderController.getFolderItems);

/**
 * @swagger
 * /api/v1/folders:
 *   post:
 *     summary: Create new folder
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *                 enum: [blue, green, yellow, orange, purple, red]
 *               parent_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created successfully
 */
router.post('/', authenticate, createFolderValidator, folderController.createFolder);

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   put:
 *     summary: Update folder
 *     tags: [Folders]
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
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Folder updated successfully
 */
router.put('/:id', authenticate, updateFolderValidator, folderController.updateFolder);

/**
 * @swagger
 * /api/v1/folders/{id}/move:
 *   put:
 *     summary: Move folder to different parent
 *     tags: [Folders]
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
 *               new_parent_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Folder moved successfully
 */
router.put('/:id/move', authenticate, moveFolderValidator, folderController.moveFolder);

/**
 * @swagger
 * /api/v1/folders/{id}:
 *   delete:
 *     summary: Delete folder (only if empty)
 *     tags: [Folders]
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
 *         description: Folder deleted successfully
 */
router.delete('/:id', authenticate, deleteFolderValidator, folderController.deleteFolder);

module.exports = router;
