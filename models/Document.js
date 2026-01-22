const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  teacher_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  folder_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('pdf', 'docx', 'pptx', 'xlsx', 'image', 'other'),
    allowNull: false
  },
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  cloudinary_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Cloudinary public_id for file deletion'
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'File size in bytes'
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 12
    }
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['teacher_id'] },
    { fields: ['folder_id'] },
    { fields: ['is_public'] },
    { fields: ['subject'] },
    { fields: ['grade'] },
    { fields: ['cloudinary_id'] }
  ]
});

// Setup association with Folder
Document.belongsTo(require('./Folder'), { as: 'folder', foreignKey: 'folder_id' });

module.exports = Document;
