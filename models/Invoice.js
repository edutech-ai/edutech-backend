const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  transactionId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'transaction_id'
  },
  userId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'user_id'
  },
  invoiceCode: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    field: 'invoice_code'
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'company_name'
  },
  taxCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tax_code'
  },
  companyAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'company_address'
  },
  companyEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'company_email'
  },
  companyPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'company_phone'
  },
  pdfUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'pdf_url'
  },
  cloudinaryId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'cloudinary_id'
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'sent', 'cancelled'),
    defaultValue: 'draft'
  },
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'issued_at'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at'
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
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Invoice;
