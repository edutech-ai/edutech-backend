/**
 * Setup model associations/relationships
 * Note: User model uses raw MySQL, not Sequelize, so we don't include User associations
 */

const SubscriptionPlan = require('./SubscriptionPlan');
const Subscription = require('./Subscription');
const Transaction = require('./Transaction');
const Invoice = require('./Invoice');

// Subscription Plan - Subscriptions (1:Many)
SubscriptionPlan.hasMany(Subscription, {
  foreignKey: 'planId',
  as: 'subscriptions'
});
Subscription.belongsTo(SubscriptionPlan, {
  foreignKey: 'planId',
  as: 'plan'
});

// Subscription - Transactions (1:Many)
Subscription.hasMany(Transaction, {
  foreignKey: 'subscriptionId',
  as: 'transactions'
});
Transaction.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription'
});

// Transaction - Invoice (1:1)
Transaction.hasOne(Invoice, {
  foreignKey: 'transactionId',
  as: 'invoice'
});
Invoice.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transaction'
});

module.exports = {
  SubscriptionPlan,
  Subscription,
  Transaction,
  Invoice
};
