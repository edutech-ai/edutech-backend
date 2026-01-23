const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  userId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'user_id'
  },
  subscriptionId: {
    type: DataTypes.CHAR(36),
    allowNull: true,
    field: 'subscription_id'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payment_method'
  },
  gateway: {
    type: DataTypes.STRING(50),
    defaultValue: 'vnpay'
  },
  gatewayTransactionId: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true,
    field: 'gateway_transaction_id'
  },
  sepayOrderCode: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true,
    field: 'sepay_order_code',
    comment: 'SePay order code'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'success', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  gatewayResponseJson: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'gateway_response_json'
  },
  ipAddress: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'ip_address'
  },
  webhookVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'webhook_verified'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'refund_amount'
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refund_reason'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at'
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
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Transaction;
