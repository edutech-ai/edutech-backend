/**
 * SERVICE: Usage Tracking & Quota Checking
 * 
 * Quản lý giới hạn sử dụng theo gói subscription:
 * - FREE: 2 lớp học, 10 quiz/tháng, 100MB lưu trữ, không AI nâng cao
 * - BASIC: 5 lớp học, 50 quiz/tháng, 500MB lưu trữ, không AI nâng cao
 * - PRO: 20 lớp học, 200 quiz/tháng, 2GB lưu trữ, có AI nâng cao
 */

const database = require('../config/database');
const { Subscription, SubscriptionPlan } = require('../models');
const { Op } = require('sequelize');

// Default limits cho user không có subscription (FREE plan)
const FREE_PLAN_LIMITS = {
  max_classes: 2,
  max_quizzes_per_month: 10,
  max_storage_mb: 100,       // 100MB
  has_advanced_ai: false
};

class UsageService {

  /**
   * Lấy subscription plan hiện tại của user
   * @param {string} userId 
   * @returns {Object} plan limits
   */
  static async getUserPlanLimits(userId) {
    try {
      // Tìm subscription active của user
      const subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active',
          endDate: { [Op.gt]: new Date() }
        },
        include: [{
          model: SubscriptionPlan,
          as: 'plan',
          attributes: ['code', 'name', 'maxClasses', 'maxQuizzesPerMonth', 'maxStorageMb', 'hasAdvancedAi']
        }],
        order: [['endDate', 'DESC']]
      });

      if (!subscription || !subscription.plan) {
        return {
          plan_code: 'FREE',
          plan_name: 'Miễn phí',
          ...FREE_PLAN_LIMITS,
          subscription_end_date: null
        };
      }

      const plan = subscription.plan;
      return {
        plan_code: plan.code,
        plan_name: plan.name,
        max_classes: plan.maxClasses,
        max_quizzes_per_month: plan.maxQuizzesPerMonth,
        max_storage_mb: plan.maxStorageMb,
        has_advanced_ai: plan.hasAdvancedAi,
        subscription_end_date: subscription.endDate
      };
    } catch (error) {
      console.error('Get user plan limits error:', error);
      // Fallback về FREE nếu có lỗi
      return {
        plan_code: 'FREE',
        plan_name: 'Miễn phí',
        ...FREE_PLAN_LIMITS,
        subscription_end_date: null
      };
    }
  }

  /**
   * Đếm số lớp học hiện tại của user
   */
  static async countClassrooms(userId) {
    const [rows] = await database.query(
      `SELECT COUNT(*) as total FROM classrooms WHERE teacher_id = ?`,
      [userId]
    );
    return rows[0].total;
  }

  /**
   * Đếm số quiz đã tạo trong tháng hiện tại
   */
  static async countQuizzesThisMonth(userId) {
    const [rows] = await database.query(
      `SELECT COUNT(*) as total FROM quizzes 
       WHERE teacher_id = ? AND is_deleted = FALSE
       AND YEAR(created_at) = YEAR(CURDATE()) 
       AND MONTH(created_at) = MONTH(CURDATE())`,
      [userId]
    );
    return rows[0].total;
  }

  /**
   * Tính tổng dung lượng lưu trữ đã dùng (bytes -> MB)
   */
  static async getStorageUsedMb(userId) {
    const [rows] = await database.query(
      `SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM documents 
       WHERE teacher_id = ?`,
      [userId]
    );
    const totalBytes = parseInt(rows[0].total_bytes) || 0;
    return Math.round((totalBytes / (1024 * 1024)) * 100) / 100; // MB, 2 decimals
  }

  /**
   * Lấy toàn bộ usage hiện tại + limits
   */
  static async getUsageSummary(userId) {
    const [planLimits, classroomCount, quizCount, storageMb] = await Promise.all([
      this.getUserPlanLimits(userId),
      this.countClassrooms(userId),
      this.countQuizzesThisMonth(userId),
      this.getStorageUsedMb(userId)
    ]);

    return {
      plan: {
        code: planLimits.plan_code,
        name: planLimits.plan_name,
        subscription_end_date: planLimits.subscription_end_date
      },
      usage: {
        classrooms: {
          used: classroomCount,
          limit: planLimits.max_classes,
          remaining: planLimits.max_classes !== null 
            ? Math.max(0, planLimits.max_classes - classroomCount) 
            : null
        },
        quizzes_this_month: {
          used: quizCount,
          limit: planLimits.max_quizzes_per_month,
          remaining: planLimits.max_quizzes_per_month !== null
            ? Math.max(0, planLimits.max_quizzes_per_month - quizCount)
            : null
        },
        storage_mb: {
          used: storageMb,
          limit: planLimits.max_storage_mb,
          remaining: planLimits.max_storage_mb !== null
            ? Math.max(0, Math.round((planLimits.max_storage_mb - storageMb) * 100) / 100)
            : null
        },
        advanced_ai: {
          available: planLimits.has_advanced_ai
        }
      }
    };
  }

  /**
   * Kiểm tra có thể tạo thêm classroom không
   */
  static async canCreateClassroom(userId) {
    const [planLimits, classroomCount] = await Promise.all([
      this.getUserPlanLimits(userId),
      this.countClassrooms(userId)
    ]);

    if (planLimits.max_classes === null) return { allowed: true }; // Unlimited

    if (classroomCount >= planLimits.max_classes) {
      return {
        allowed: false,
        message: `Bạn đã đạt giới hạn ${planLimits.max_classes} lớp học của gói ${planLimits.plan_name}. Vui lòng nâng cấp gói để tạo thêm.`,
        current: classroomCount,
        limit: planLimits.max_classes,
        plan: planLimits.plan_code
      };
    }

    return { allowed: true };
  }

  /**
   * Kiểm tra có thể tạo thêm quiz không
   */
  static async canCreateQuiz(userId) {
    const [planLimits, quizCount] = await Promise.all([
      this.getUserPlanLimits(userId),
      this.countQuizzesThisMonth(userId)
    ]);

    if (planLimits.max_quizzes_per_month === null) return { allowed: true }; // Unlimited

    if (quizCount >= planLimits.max_quizzes_per_month) {
      return {
        allowed: false,
        message: `Bạn đã đạt giới hạn ${planLimits.max_quizzes_per_month} quiz/tháng của gói ${planLimits.plan_name}. Vui lòng nâng cấp gói để tạo thêm.`,
        current: quizCount,
        limit: planLimits.max_quizzes_per_month,
        plan: planLimits.plan_code
      };
    }

    return { allowed: true };
  }

  /**
   * Kiểm tra có thể upload thêm file không (dựa trên file_size mới)
   * @param {string} userId 
   * @param {number} newFileSizeBytes - Size file mới tính bằng bytes
   */
  static async canUploadFile(userId, newFileSizeBytes = 0) {
    const [planLimits, storageMb] = await Promise.all([
      this.getUserPlanLimits(userId),
      this.getStorageUsedMb(userId)
    ]);

    if (planLimits.max_storage_mb === null) return { allowed: true }; // Unlimited

    const newFileMb = newFileSizeBytes / (1024 * 1024);
    const totalAfterUpload = storageMb + newFileMb;

    if (totalAfterUpload > planLimits.max_storage_mb) {
      return {
        allowed: false,
        message: `Dung lượng lưu trữ đã đạt giới hạn ${planLimits.max_storage_mb}MB của gói ${planLimits.plan_name}. Đã dùng ${storageMb.toFixed(1)}MB. Vui lòng nâng cấp gói hoặc xóa bớt tài liệu.`,
        current_mb: storageMb,
        limit_mb: planLimits.max_storage_mb,
        plan: planLimits.plan_code
      };
    }

    return { allowed: true };
  }

  /**
   * Kiểm tra có quyền dùng AI nâng cao không
   */
  static async canUseAdvancedAI(userId) {
    const planLimits = await this.getUserPlanLimits(userId);

    if (!planLimits.has_advanced_ai) {
      return {
        allowed: false,
        message: `Tính năng AI nâng cao chỉ dành cho gói PRO trở lên. Gói hiện tại: ${planLimits.plan_name}. Vui lòng nâng cấp để sử dụng.`,
        plan: planLimits.plan_code
      };
    }

    return { allowed: true };
  }
}

module.exports = UsageService;
