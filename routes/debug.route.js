const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debug.controller');

/**
 * @swagger
 * /api/debug/omr-coordinates:
 *   post:
 *     summary: Debug OMR coordinates - vẽ detection regions lên ảnh
 *     tags: [Debug]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               answer_sheet:
 *                 type: string
 *                 format: binary
 *                 description: Answer sheet image (JPG/PNG)
 *     responses:
 *       200:
 *         description: Image with debug circles
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/omr-coordinates', debugController.debugOMRCoordinates);

module.exports = router;
