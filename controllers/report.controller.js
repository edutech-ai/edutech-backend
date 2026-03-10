const { validationResult } = require('express-validator');
const cloudinary = require('../config/cloudinary');
const BugReport = require('../models/BugReport');
const FeatureRequest = require('../models/FeatureRequest');

class ReportController {
  // ─── Bug Reports ──────────────────────────────────────────────

  static async getBugReports(req, res) {
    try {
      const { status, mine, page = 1, limit = 20 } = req.query;
      const requestUserId = req.user?.id || null;
      const user_id = mine === 'true' ? requestUserId : null;

      const result = await BugReport.findAll({
        status: status || null,
        user_id,
        requestUserId,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('getBugReports error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách báo cáo', error: error.message });
    }
  }

  static async createBugReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', errors: errors.array() });
      }

      const { title, description } = req.body;
      const user_id = req.user.id;
      const attachments = [];

      // Upload files to Cloudinary if any
      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map((file) =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `edutech/bug-reports/${user_id}`,
                resource_type: 'auto',
                public_id: `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`,
              },
              (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, cloudinary_id: result.public_id, resource_type: result.resource_type });
              }
            );
            stream.end(file.buffer);
          })
        );
        const uploaded = await Promise.all(uploadPromises);
        attachments.push(...uploaded.map((u) => u.url));
      }

      const report = await BugReport.create({ user_id, title, description, attachments });

      res.status(201).json({ success: true, message: 'Báo cáo lỗi đã được gửi thành công', data: report });
    } catch (error) {
      console.error('createBugReport error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi gửi báo cáo', error: error.message });
    }
  }

  // ─── Feature Requests ────────────────────────────────────────

  static async getFeatureRequests(req, res) {
    try {
      const { status, mine, page = 1, limit = 20 } = req.query;
      const requestUserId = req.user?.id || null;
      const user_id = mine === 'true' ? requestUserId : null;

      const result = await FeatureRequest.findAll({
        status: status || null,
        user_id,
        requestUserId,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('getFeatureRequests error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách đề xuất', error: error.message });
    }
  }

  static async createFeatureRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', errors: errors.array() });
      }

      const { title, description } = req.body;
      const request = await FeatureRequest.create({ user_id: req.user.id, title, description });

      res.status(201).json({ success: true, message: 'Đề xuất đã được gửi thành công', data: request });
    } catch (error) {
      console.error('createFeatureRequest error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi gửi đề xuất', error: error.message });
    }
  }

  static async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const result = await FeatureRequest.toggleLike(parseInt(id), req.user.id);

      // Re-fetch updated record
      const updated = await FeatureRequest.findById(parseInt(id), req.user.id);
      res.json({ success: true, ...result, data: updated });
    } catch (error) {
      console.error('toggleLike error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi thực hiện thao tác', error: error.message });
    }
  }
}

module.exports = ReportController;
