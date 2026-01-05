const { body } = require('express-validator');

// Validation rules cho profile
const profileValidation = [
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('gender')
    .optional()
    .isString()
    .withMessage('Gender must be a string'),
  body('avatar_url')
    .optional()
    .custom((value) => {
      // Accept URL hoặc base64 data URI
      const urlPattern = /^https?:\/\/.+/;
      const base64Pattern = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/;
      if (urlPattern.test(value) || base64Pattern.test(value)) {
        return true;
      }
      throw new Error('Avatar must be valid URL or base64 image');
    }),
  body('address')
    .optional()
    .isString()
    .withMessage('Address must be a string'),
  body('email_notification')
    .optional()
    .isBoolean()
    .withMessage('Email notification must be boolean'),
  body('push_notification')
    .optional()
    .isBoolean()
    .withMessage('Push notification must be boolean')
];

module.exports = {
  profileValidation
};
