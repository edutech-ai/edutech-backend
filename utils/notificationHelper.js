const Notification = require('../models/Notification');

class NotificationHelper {
    // Tài khoản
    static async notifyAccountCreated(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'account',
            title: 'Chào mừng thầy cô đã gia nhập EduTech!',
            message: 'Tài khoản đã được tạo thành công.',
            url: '/dashboard/profile'
        });
    }

    static async notifyLogin(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'account',
            title: 'Đăng nhập thành công',
            message: 'Bạn đã đăng nhập vào EduTech thành công.',
            url: null
        });
    }

    static async notifyPasswordChanged(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'account',
            title: 'Mật khẩu đã được thay đổi',
            message: 'Mật khẩu của bạn đã được thay đổi thành công.',
            url: '/dashboard/profile'
        });
    }

    static async notifyPasswordResetEmail(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'account',
            title: 'Email đặt lại mật khẩu',
            message: 'Email đặt lại mật khẩu đã được gửi tới địa chỉ của bạn. Vui lòng kiểm tra hộp thư.',
            url: null
        });
    }

    // Hồ sơ
    static async notifyProfileUpdated(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'profile',
            title: 'Cập nhật thông tin thành công',
            message: 'Thông tin cá nhân của bạn đã được cập nhật thành công.',
            url: '/dashboard/profile'
        });
    }

    // Thanh toán
    static async notifyPaymentSuccess(userId, planName) {
        return await Notification.create({
            user_id: userId,
            type: 'payment',
            title: 'Thanh toán thành công',
            message: 'Thanh toán đã thành công. Vui lòng kiểm tra email để nhận thông tin.',
            url: '/dashboard/payment/history'
        });
    }

    static async notifyPaymentFailed(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'payment',
            title: 'Thanh toán không thành công',
            message: 'Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ.',
            url: '/dashboard/payment'
        });
    }

    static async notifySubscriptionCancelled(userId) {
        return await Notification.create({
            user_id: userId,
            type: 'payment',
            title: 'Gói đăng ký đã hủy',
            message: 'Gói đăng ký đã hủy thành công. Tài khoản của thầy cô sẽ tiếp tục với gói hiện tại cho đến khi hết thời hạn.',
            url: '/dashboard/subscription'
        });
    }

    static async notifySubscriptionUpgraded(userId, planName) {
        return await Notification.create({
            user_id: userId,
            type: 'payment',
            title: 'Nâng cấp tài khoản thành công',
            message: `Chúc mừng tài khoản đã được nâng cấp lên ${planName} thành công.`,
            url: '/dashboard/subscription'
        });
    }

    // Quiz
    static async notifyQuizCreated(userId, quizTitle, quizId) {
        return await Notification.create({
            user_id: userId,
            type: 'quiz',
            title: 'Tạo đề thi thành công',
            message: `Bài thi "${quizTitle}" đã được tạo thành công. Bấm vào đây để xem chi tiết.`,
            url: `/dashboard/quiz/${quizId}`
        });
    }

    // System
    static async notifySystemMaintenance(userId, maintenanceTime) {
        return await Notification.create({
            user_id: userId,
            type: 'system',
            title: 'Thông báo bảo trì hệ thống',
            message: `Thông báo: EduTech sẽ bảo trì hệ thống vào ${maintenanceTime}. Một số chức năng có thể tạm ngưng trong thời gian này.`,
            url: null
        });
    }

    // Classroom
    static async notifyClassroomCreated(userId, classroomName, classroomId) {
        return await Notification.create({
            user_id: userId,
            type: 'classroom',
            title: 'Tạo lớp học thành công',
            message: `Lớp "${classroomName}" đã được tạo thành công.`,
            url: `/dashboard/classroom/${classroomId}`
        });
    }

    static async notifyClassroomCreationFailed(userId, classroomName) {
        return await Notification.create({
            user_id: userId,
            type: 'classroom',
            title: 'Tạo lớp học thất bại',
            message: `Lớp "${classroomName}" tạo thất bại. Bạn đã đạt giới hạn của gói đăng ký.`,
            url: '/subscription'
        });
    }

    static async notifyStudentAdded(userId, classroomName, classroomId) {
        return await Notification.create({
            user_id: userId,
            type: 'classroom',
            title: 'Thêm học sinh thành công',
            message: `Thêm học sinh vào lớp "${classroomName}" thành công.`,
            url: `/dashboard/classroom/${classroomId}`
        });
    }
}

module.exports = NotificationHelper;

