/**
 * SePay Configuration
 * Get credentials: https://my.sepay.vn/
 * Docs: https://docs.sepay.vn/
 */

const sepayConfig = {
  // SePay API URLs
  apiUrl: process.env.SEPAY_API_URL || 'https://my.sepay.vn',
  
  // SePay Credentials
  accessToken: process.env.SEPAY_ACCESS_TOKEN || '',
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
  accountName: process.env.SEPAY_ACCOUNT_NAME || '',
  bankCode: process.env.SEPAY_BANK_CODE || 'MBBank', // MBBank, VCB, TCB, etc.
  
  // Webhook Secret (for signature verification)
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || '',
  
  // Callback URLs
  returnUrl: process.env.SEPAY_RETURN_URL || `${process.env.FRONTEND_URL}/payment/result`,
  webhookUrl: process.env.SEPAY_WEBHOOK_URL || '',
  
  // Payment Settings
  currency: 'VND',
  locale: 'vi', // 'vi' or 'en'
  
  // Timeout (minutes)
  paymentTimeout: 15,
  
  // QR Template
  qrTemplate: 'compact2' // compact, compact2, print, qr_only
};

module.exports = sepayConfig;
