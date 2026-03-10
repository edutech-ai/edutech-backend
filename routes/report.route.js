const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const { authenticate, authenticateOptional } = require('../middlewares/auth');
const ReportController = require('../controllers/report.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ ảnh (JPG, PNG, WEBP) hoặc video (MP4, MOV)'), false);
  },
});

const bugReportValidation = [
  body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống').isLength({ max: 100 }).withMessage('Tiêu đề tối đa 100 ký tự'),
  body('description').trim().notEmpty().withMessage('Mô tả không được để trống').isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự'),
];

const featureRequestValidation = [
  body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống').isLength({ max: 100 }).withMessage('Tiêu đề tối đa 100 ký tự'),
  body('description').trim().notEmpty().withMessage('Mô tả không được để trống').isLength({ max: 500 }).withMessage('Mô tả tối đa 500 ký tự'),
];

// ─── Bug Reports ─────────────────────────────────────────────
router.get('/bugs', authenticateOptional, ReportController.getBugReports);
router.post('/bugs', authenticate, upload.array('attachments', 5), bugReportValidation, ReportController.createBugReport);

// ─── Feature Requests ────────────────────────────────────────
router.get('/features', authenticateOptional, ReportController.getFeatureRequests);
router.post('/features', authenticate, featureRequestValidation, ReportController.createFeatureRequest);
router.post('/features/:id/like', authenticate, ReportController.toggleLike);

module.exports = router;
