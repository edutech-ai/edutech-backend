const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Payment validators
 */
const paymentValidator = {
  /**
   * Validate create payment request
   */
  createPayment: [
    body('planCode')
      .notEmpty().withMessage('Mã gói dịch vụ không được để trống')
      .isString().withMessage('Mã gói dịch vụ phải là chuỗi')
      .isLength({ min: 2, max: 50 }).withMessage('Mã gói dịch vụ không hợp lệ'),
    validate
  ],

  /**
   * Validate plan code param
   */
  planCode: [
    param('code')
      .notEmpty().withMessage('Mã gói dịch vụ không được để trống')
      .isString().withMessage('Mã gói dịch vụ phải là chuỗi')
      .isLength({ min: 2, max: 50 }).withMessage('Mã gói dịch vụ không hợp lệ'),
    validate
  ],

  /**
   * Validate transaction ID param
   */
  transactionId: [
    param('transactionId')
      .notEmpty().withMessage('ID giao dịch không được để trống')
      .isUUID().withMessage('ID giao dịch không hợp lệ'),
    validate
  ],

  /**
   * Validate get transactions query
   */
  getTransactions: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Số lượng phải từ 1-100'),
    query('status')
      .optional()
      .isIn(['pending', 'processing', 'success', 'failed', 'refunded'])
      .withMessage('Trạng thái không hợp lệ'),
    validate
  ],

  /**
   * Validate refund request
   */
  requestRefund: [
    body('transactionId')
      .notEmpty().withMessage('ID giao dịch không được để trống')
      .isUUID().withMessage('ID giao dịch không hợp lệ'),
    body('reason')
      .notEmpty().withMessage('Lý do hoàn tiền không được để trống')
      .isString().withMessage('Lý do hoàn tiền phải là chuỗi')
      .isLength({ min: 10, max: 500 }).withMessage('Lý do hoàn tiền phải từ 10-500 ký tự'),
    validate
  ],

  /**
   * Validate invoice request
   */
  requestInvoice: [
    body('transactionId')
      .notEmpty().withMessage('ID giao dịch không được để trống')
      .isUUID().withMessage('ID giao dịch không hợp lệ'),
    body('companyName')
      .notEmpty().withMessage('Tên công ty không được để trống')
      .isString().withMessage('Tên công ty phải là chuỗi')
      .isLength({ min: 3, max: 255 }).withMessage('Tên công ty phải từ 3-255 ký tự'),
    body('taxCode')
      .notEmpty().withMessage('Mã số thuế không được để trống')
      .isString().withMessage('Mã số thuế phải là chuỗi')
      .matches(/^[0-9]{10,13}$/).withMessage('Mã số thuế phải là 10-13 chữ số'),
    body('companyAddress')
      .notEmpty().withMessage('Địa chỉ công ty không được để trống')
      .isString().withMessage('Địa chỉ công ty phải là chuỗi')
      .isLength({ min: 10, max: 500 }).withMessage('Địa chỉ công ty phải từ 10-500 ký tự'),
    body('companyEmail')
      .optional()
      .isEmail().withMessage('Email công ty không hợp lệ'),
    body('companyPhone')
      .optional()
      .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại phải là 10-11 chữ số'),
    validate
  ]
};

module.exports = paymentValidator;
