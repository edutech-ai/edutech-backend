const redisClient = require('../config/redis');

class OTP {
  // Tạo mã OTP 6 số
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Tạo Redis key
  static getKey(email) {
    return `otp:${email.toLowerCase()}`;
  }

  // Tạo OTP token mới và lưu vào Redis
  static async create(userId, email) {
    const otpCode = this.generateOTP();
    const key = this.getKey(email);
    const ttl = 5 * 60; // 5 phút (seconds)

    try {
      // Lưu vào Redis với TTL tự động expire
      const data = JSON.stringify({
        userId,
        email,
        otpCode,
        createdAt: Date.now()
      });

      await redisClient.setEx(key, ttl, data);

      console.log(`✅ OTP created for ${email}: ${otpCode} (expires in 5 min)`);

      return {
        otpCode,
        expiresAt: new Date(Date.now() + ttl * 1000)
      };
    } catch (error) {
      console.error('Redis error, falling back to in-memory:', error.message);
      // Fallback to in-memory if Redis fails
      return this.createInMemory(userId, email);
    }
  }

  // Verify OTP
  static async verify(email, otpCode) {
    const key = this.getKey(email);

    try {
      // Lấy OTP từ Redis
      const data = await redisClient.get(key);

      if (!data) {
        return { 
          valid: false, 
          message: 'Mã OTP không hợp lệ hoặc đã hết hạn' 
        };
      }

      const otpData = JSON.parse(data);

      // Check OTP code
      if (otpData.otpCode !== otpCode) {
        return { 
          valid: false, 
          message: 'Mã OTP không đúng' 
        };
      }

      // Xóa OTP sau khi verify thành công (one-time use)
      await redisClient.del(key);

      console.log(`✅ OTP verified for ${email}`);

      return {
        valid: true,
        userId: otpData.userId,
        email: otpData.email
      };
    } catch (error) {
      console.error('Redis error:', error.message);
      return { 
        valid: false, 
        message: 'Lỗi hệ thống, vui lòng thử lại' 
      };
    }
  }

  // Xóa OTP cũ của user (trước khi tạo mới)
  static async deleteOldOTPs(email) {
    const key = this.getKey(email);
    try {
      await redisClient.del(key);
      console.log(`🗑️  Old OTP deleted for ${email}`);
    } catch (error) {
      console.error('Redis delete error:', error.message);
    }
  }

  // ========================================
  // FALLBACK: In-Memory Storage (nếu Redis fails)
  // ========================================
  static inMemoryStore = new Map();

  static createInMemory(userId, email) {
    const otpCode = this.generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.inMemoryStore.set(email.toLowerCase(), {
      userId,
      email,
      otpCode,
      expiresAt
    });

    // Auto cleanup sau 5 phút
    setTimeout(() => {
      this.inMemoryStore.delete(email.toLowerCase());
    }, 5 * 60 * 1000);

    console.log(`⚠️  OTP created in-memory for ${email}: ${otpCode}`);

    return {
      otpCode,
      expiresAt: new Date(expiresAt)
    };
  }

  // Check Redis connection status
  static async isRedisConnected() {
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = OTP;
