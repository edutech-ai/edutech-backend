const { body, param, query } = require('express-validator');

const MAX_FOLDER_DEPTH = 3;

const createFolderValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Folder name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Folder name must be between 1 and 100 characters'),
  
  body('color')
    .optional()
    .isIn(['blue', 'green', 'yellow', 'orange', 'purple', 'red'])
    .withMessage('Invalid color. Must be one of: blue, green, yellow, orange, purple, red'),
  
  body('parent_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid parent_id format')
];

const updateFolderValidator = [
  param('id')
    .isUUID().withMessage('Invalid folder id'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Folder name cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('Folder name must be between 1 and 100 characters'),
  
  body('color')
    .optional()
    .isIn(['blue', 'green', 'yellow', 'orange', 'purple', 'red'])
    .withMessage('Invalid color. Must be one of: blue, green, yellow, orange, purple, red')
];

const moveFolderValidator = [
  param('id')
    .isUUID().withMessage('Invalid folder id'),
  
  body('new_parent_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid new_parent_id format')
];

const getFolderValidator = [
  param('id')
    .isUUID().withMessage('Invalid folder id')
];

const getFoldersValidator = [
  query('parent_id')
    .optional({ nullable: true })
    .isUUID().withMessage('Invalid parent_id format')
];

const deleteFolderValidator = [
  param('id')
    .isUUID().withMessage('Invalid folder id')
];

module.exports = {
  createFolderValidator,
  updateFolderValidator,
  moveFolderValidator,
  getFolderValidator,
  getFoldersValidator,
  deleteFolderValidator,
  MAX_FOLDER_DEPTH
};
