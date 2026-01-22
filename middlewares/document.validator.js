const { body, param, query } = require('express-validator');

const uploadDocumentValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Document name is required')
    .isLength({ min: 1, max: 255 }).withMessage('Document name must be between 1 and 255 characters'),
  
  body('folder_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid folder_id format'),
  
  body('is_public')
    .optional()
    .isBoolean().withMessage('is_public must be a boolean'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Subject must be between 1 and 100 characters'),
  
  body('grade')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('Grade must be between 1 and 12'),
  
  body('tags')
    .optional()
    .customSanitizer((value) => {
      // Nếu là string, split thành array
      if (typeof value === 'string') {
        return value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      // Nếu đã là array, giữ nguyên
      if (Array.isArray(value)) {
        return value.map(tag => String(tag).trim()).filter(tag => tag.length > 0);
      }
      return [];
    })
    .isArray().withMessage('Tags must be an array'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
];

const updateDocumentValidator = [
  param('id')
    .isUUID().withMessage('Invalid document id'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Document name cannot be empty')
    .isLength({ min: 1, max: 255 }).withMessage('Document name must be between 1 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Subject must be between 1 and 100 characters'),
  
  body('grade')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('Grade must be between 1 and 12'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
];

const getDocumentValidator = [
  param('id')
    .isUUID().withMessage('Invalid document id')
];

const getDocumentsValidator = [
  query('folder_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid folder_id format'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('is_public')
    .optional()
    .isBoolean().withMessage('is_public must be a boolean')
];

const moveDocumentValidator = [
  param('id')
    .isUUID().withMessage('Invalid document id'),
  
  body('folder_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid folder_id format')
];

const shareDocumentValidator = [
  param('id')
    .isUUID().withMessage('Invalid document id'),
  
  body('is_public')
    .isBoolean().withMessage('is_public must be a boolean')
];

const deleteDocumentValidator = [
  param('id')
    .isUUID().withMessage('Invalid document id')
];

module.exports = {
  uploadDocumentValidator,
  updateDocumentValidator,
  getDocumentValidator,
  getDocumentsValidator,
  moveDocumentValidator,
  shareDocumentValidator,
  deleteDocumentValidator
};
