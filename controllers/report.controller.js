const { validationResult } = require('express-validator');
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

      const { title, description, attachments = [] } = req.body;
      const user_id = req.user.id;

      const report = await BugReport.create({ user_id, title, description, attachments });

      res.status(201).json({ success: true, message: 'Báo cáo lỗi đã được gửi thành công', data: report });
    } catch (error) {
      console.error('createBugReport error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi gửi báo cáo', error: error.message });
    }
  }

  static async updateBugReport(req, res) {
    try {
      const { id } = req.params;
      const report = await BugReport.findById(parseInt(id), req.user.id);
      if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });
      if (report.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa' });

      const { title, description, attachments } = req.body;
      const updated = await BugReport.update(parseInt(id), { title, description, attachments });
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('updateBugReport error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật báo cáo', error: error.message });
    }
  }

  static async deleteBugReport(req, res) {
    try {
      const { id } = req.params;
      const report = await BugReport.findById(parseInt(id), req.user.id);
      if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });
      if (report.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Không có quyền xoá' });

      await BugReport.delete(parseInt(id));
      res.json({ success: true, message: 'Đã xoá báo cáo' });
    } catch (error) {
      console.error('deleteBugReport error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi xoá báo cáo', error: error.message });
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

  static async updateFeatureRequest(req, res) {
    try {
      const { id } = req.params;
      const request = await FeatureRequest.findById(parseInt(id), req.user.id);
      if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất' });
      if (request.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa' });

      const { title, description } = req.body;
      const updated = await FeatureRequest.update(parseInt(id), { title, description });
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('updateFeatureRequest error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật đề xuất', error: error.message });
    }
  }

  static async deleteFeatureRequest(req, res) {
    try {
      const { id } = req.params;
      const request = await FeatureRequest.findById(parseInt(id), req.user.id);
      if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất' });
      if (request.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Không có quyền xoá' });

      await FeatureRequest.delete(parseInt(id));
      res.json({ success: true, message: 'Đã xoá đề xuất' });
    } catch (error) {
      console.error('deleteFeatureRequest error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi xoá đề xuất', error: error.message });
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

  static async updateBugStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const valid = ['pending', 'confirmed', 'fixed'];
      if (!valid.includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }
      const report = await BugReport.findById(parseInt(id));
      if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });
      const updated = await BugReport.updateStatus(parseInt(id), status);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('updateBugStatus error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái', error: error.message });
    }
  }

  static async updateFeatureStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const valid = ['pending', 'confirmed', 'deployed'];
      if (!valid.includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }
      const request = await FeatureRequest.findById(parseInt(id));
      if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy đề xuất' });
      const updated = await FeatureRequest.updateStatus(parseInt(id), status);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('updateFeatureStatus error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái', error: error.message });
    }
  }
}

module.exports = ReportController;
