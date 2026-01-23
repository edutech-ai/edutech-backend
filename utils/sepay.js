const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const sepayConfig = require('../config/sepay.js');

/**
 * SePay Payment Helper Functions
 * Docs: https://docs.sepay.vn/
 */
class SepayHelper {
  /**
   * Create payment request with SePay
   * SePay uses bank transfer monitoring system
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment info with QR code
   */
  static createPaymentRequest(params) {
    const {
      orderCode,
      amount,
      description,
      buyerName,
      buyerEmail
    } = params;

    // SePay uses bank transfer content matching
    // Format: <PREFIX> <ORDER_CODE>
    const transferContent = `EDUTECH ${orderCode}`;

    // Create VietQR link for QR code
    const qrData = this.generateVietQR({
      accountNo: sepayConfig.accountNumber,
      accountName: sepayConfig.accountName,
      bankCode: sepayConfig.bankCode,
      amount: amount,
      description: transferContent
    });

    return {
      success: true,
      data: {
        accountNumber: sepayConfig.accountNumber,
        accountName: sepayConfig.accountName,
        bankCode: sepayConfig.bankCode,
        amount: amount,
        content: transferContent,
        qrCode: qrData.qrCodeUrl,
        qrDataUrl: qrData.qrDataUrl,
        orderCode: orderCode,
        note: `Chuyển khoản với nội dung: ${transferContent}`
      }
    };
  }

  /**
   * Generate VietQR code
   * @param {Object} params - QR parameters
   * @returns {Object} QR URLs
   */
  static generateVietQR(params) {
    const {
      accountNo,
      accountName,
      bankCode,
      amount,
      description
    } = params;

    // VietQR API endpoint
    const vietQRBase = 'https://img.vietqr.io/image';
    
    // QR Code URL with template
    const qrCodeUrl = `${vietQRBase}/${bankCode}-${accountNo}-${sepayConfig.qrTemplate}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
    
    // QR Data URL (for banking apps)
    const qrDataUrl = `https://api.vietqr.io/v2/generate`;

    return {
      qrCodeUrl,
      qrDataUrl
    };
  }

  /**
   * Get transactions from SePay
   * Check if payment has been received
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise<Object>} Transaction list
   */
  static async getTransactions(limit = 50) {
    try {
      const response = await axios.get(
        `${sepayConfig.apiUrl}/userapi/transactions/list`,
        {
          params: { limit },
          headers: {
            'Authorization': `Bearer ${sepayConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('SePay getTransactions error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Check if payment is received
   * @param {string} transferContent - Expected transfer content
   * @param {number} amount - Expected amount
   * @returns {Promise<Object>} Payment status
   */
  static async checkPaymentReceived(transferContent, amount) {
    try {
      const transactions = await this.getTransactions(100);
      
      if (!transactions.success) {
        return {
          success: false,
          paid: false,
          message: 'Không thể kiểm tra giao dịch'
        };
      }

      // Find matching transaction
      const matchedTransaction = transactions.data.transactions?.find(txn => {
        const contentMatch = txn.transaction_content?.includes(transferContent) ||
                           txn.transaction_content?.includes(transferContent.replace(/\s/g, ''));
        const amountMatch = Math.abs(txn.amount_in - amount) < 100; // Allow 100 VND difference
        const isCredit = txn.amount_in > 0;

        return contentMatch && amountMatch && isCredit;
      });

      if (matchedTransaction) {
        return {
          success: true,
          paid: true,
          transaction: matchedTransaction,
          message: 'Đã nhận thanh toán'
        };
      }

      return {
        success: true,
        paid: false,
        message: 'Chưa nhận được thanh toán'
      };
    } catch (error) {
      console.error('Error checking payment:', error);
      return {
        success: false,
        paid: false,
        message: 'Lỗi khi kiểm tra thanh toán'
      };
    }
  }

  /**
   * Get account balance
   * @returns {Promise<Object>} Account balance
   */
  static async getAccountBalance() {
    try {
      const response = await axios.get(
        `${sepayConfig.apiUrl}/userapi/account-balance`,
        {
          headers: {
            'Authorization': `Bearer ${sepayConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('SePay getAccountBalance error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} webhookData - Webhook data
   * @param {string} signature - Signature from header
   * @returns {boolean} Is valid
   */
  static verifyWebhookSignature(webhookData, signature) {
    try {
      // SePay webhook signature verification
      // Using webhook secret key from config
      if (!sepayConfig.webhookSecret) {
        console.warn('SEPAY_WEBHOOK_SECRET not configured, skipping verification');
        return true; // Allow if not configured (for testing)
      }

      const dataString = JSON.stringify(webhookData);
      const hash = crypto
        .createHmac('sha256', sepayConfig.webhookSecret)
        .update(dataString)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Generate unique order code (6-12 digits)
   * @returns {string} Order code
   */
  static generateOrderCode() {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return timestamp + random;
  }

  /**
   * Parse transaction status from SePay
   * @param {Object} transaction - Transaction from SePay
   * @returns {Object} Parsed status
   */
  static parseTransactionStatus(transaction) {
    if (transaction.amount_in > 0) {
      return {
        success: true,
        message: 'Giao dịch thành công',
        status: 'success'
      };
    }

    return {
      success: false,
      message: 'Chưa nhận được tiền',
      status: 'pending'
    };
  }

  /**
   * Format amount to VND
   */
  static formatAmount(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  /**
   * Get client IP address
   */
  static getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
  }

  /**
   * Format bank name
   */
  static getBankName(bankCode) {
    const banks = {
      'MBBank': 'MB Bank',
      'VCB': 'Vietcombank',
      'TCB': 'Techcombank',
      'ACB': 'ACB',
      'VPBank': 'VPBank',
      'TPBank': 'TPBank',
      'BIDV': 'BIDV',
      'VietinBank': 'VietinBank',
      'Agribank': 'Agribank',
      'Sacombank': 'Sacombank'
    };

    return banks[bankCode] || bankCode;
  }

  /**
   * Create refund request
   * Note: SePay refunds must be done manually
   */
  static async createRefund(params) {
    // SePay doesn't have automatic refund API
    // Must be processed manually through bank transfer
    return {
      success: false,
      error: 'SePay yêu cầu hoàn tiền thủ công. Vui lòng chuyển khoản lại cho khách hàng.'
    };
  }
}

module.exports = SepayHelper;
