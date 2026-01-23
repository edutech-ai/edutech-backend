const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  code: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'VND'
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    field: 'duration_days'
  },
  maxClasses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_classes'
  },
  maxQuizzesPerMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_quizzes_per_month'
  },
  maxStorageMb: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_storage_mb'
  },
  hasAdvancedAi: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_advanced_ai'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of feature descriptions'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'subscription_plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SubscriptionPlan;
