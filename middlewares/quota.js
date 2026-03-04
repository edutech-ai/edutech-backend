/**
 * MIDDLEWARE: Quota/Usage Limit Checker
 * 
 * Kiểm tra giới hạn sử dụng theo gói subscription trước khi cho phép tạo tài nguyên.
 * 
 * Gói FREE:  2 lớp | 10 quiz/tháng | 100MB | Không AI nâng cao
 * Gói BASIC: 5 lớp | 50 quiz/tháng | 500MB | Không AI nâng cao
 * Gói PRO:  20 lớp | 200 quiz/tháng | 2GB  | Có AI nâng cao
 */

const UsageService = require('../services/usage.service');

/**
 * Kiểm tra quota trước khi tạo classroom
 */
const checkClassroomQuota = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UsageService.canCreateClassroom(userId);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          type: 'classroom',
          message: result.message,
          current: result.current,
          limit: result.limit,
          plan: result.plan
        }
      });
    }

    next();
  } catch (error) {
    console.error('Check classroom quota error:', error);
    // Nếu lỗi khi check quota, vẫn cho phép (fail open)
    next();
  }
};

/**
 * Kiểm tra quota trước khi tạo quiz
 */
const checkQuizQuota = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UsageService.canCreateQuiz(userId);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          type: 'quiz',
          message: result.message,
          current: result.current,
          limit: result.limit,
          plan: result.plan
        }
      });
    }

    next();
  } catch (error) {
    console.error('Check quiz quota error:', error);
    next();
  }
};

/**
 * Kiểm tra quota storage trước khi upload document
 */
const checkStorageQuota = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Lấy file size từ request (multer hoặc express-fileupload)
    let fileSize = 0;
    if (req.file) {
      fileSize = req.file.size || req.file.buffer?.length || 0;
    } else if (req.files && req.files.file) {
      fileSize = req.files.file.size || 0;
    }

    const result = await UsageService.canUploadFile(userId, fileSize);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          type: 'storage',
          message: result.message,
          current_mb: result.current_mb,
          limit_mb: result.limit_mb,
          plan: result.plan
        }
      });
    }

    next();
  } catch (error) {
    console.error('Check storage quota error:', error);
    next();
  }
};

/**
 * Kiểm tra quyền dùng AI nâng cao
 */
const checkAdvancedAIAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await UsageService.canUseAdvancedAI(userId);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_RESTRICTED',
          type: 'advanced_ai',
          message: result.message,
          plan: result.plan
        }
      });
    }

    next();
  } catch (error) {
    console.error('Check AI access error:', error);
    next();
  }
};

module.exports = {
  checkClassroomQuota,
  checkQuizQuota,
  checkStorageQuota,
  checkAdvancedAIAccess
};
