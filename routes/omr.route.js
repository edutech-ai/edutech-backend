const express = require('express');
const router = express.Router();
const omrController = require('../controllers/omr.controller');
const { authenticate } = require('../middlewares/auth');

// All OMR routes require authentication
router.use(authenticate);

// Exam Batches
router.get('/exam-batches/classroom/:classroomId', omrController.getExamBatches);
router.get('/exam-batches/:batchId', omrController.getExamBatch);
router.post('/exam-batches', omrController.createExamBatch);

// Answer Key
router.get('/answer-key/batch/:batchId', omrController.getAnswerKey);

module.exports = router;
