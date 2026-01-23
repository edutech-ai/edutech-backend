const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { SubscriptionPlan, Subscription, Transaction, Invoice } = require('../models');
const SepayHelper = require('../utils/sepay');
const sepayConfig = require('../config/sepay');

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment and subscription management
 */

const paymentController = {
  /**
   * Get all subscription plans
   * @swagger
   * /api/v1/payment/plans:
   *   get:
   *     summary: Get all subscription plans
   *     tags: [Payment]
   *     responses:
   *       200:
   *         description: List of subscription plans
   */
  getPlans: async (req, res) => {
    try {
      const plans = await SubscriptionPlan.findAll({
        where: { isActive: true },
        order: [['displayOrder', 'ASC']]
      });

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Error getting plans:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách gói dịch vụ'
      });
    }
  },

  /**
   * Get plan by code
   */
  getPlanByCode: async (req, res) => {
    try {
      const { code } = req.params;
      
      const plan = await SubscriptionPlan.findOne({
        where: { code, isActive: true }
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy gói dịch vụ'
        });
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Error getting plan:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin gói dịch vụ'
      });
    }
  },

  /**
   * Create SePay payment request
   * @swagger
   * /api/v1/payment/create:
   *   post:
   *     summary: Create payment request with bank transfer
   *     tags: [Payment]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - planCode
   *             properties:
   *               planCode:
   *                 type: string
   *     responses:
   *       200:
   *         description: Payment info created
   */
  createPayment: async (req, res) => {
    try {
      const { planCode } = req.body;
      const userId = req.user.id;
      const userEmail = req.user.email;
      const userName = req.user.name || req.user.email;

      // Get plan
      const plan = await SubscriptionPlan.findOne({
        where: { code: planCode, isActive: true }
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy gói dịch vụ'
        });
      }

      // Check if user has active subscription
      const existingSubscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active',
          endDate: { [require('sequelize').Op.gt]: new Date() }
        }
      });

      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đang có gói dịch vụ đang hoạt động'
        });
      }

      // Create subscription (pending)
      const subscription = await Subscription.create({
        id: uuidv4(),
        userId,
        planId: plan.id,
        status: 'pending',
        autoRenew: true
      });

      // Create transaction
      const orderCode = SepayHelper.generateOrderCode();
      const transaction = await Transaction.create({
        id: uuidv4(),
        userId,
        subscriptionId: subscription.id,
        amount: plan.price,
        description: `Thanh toán gói ${plan.name}`,
        paymentMethod: 'sepay_bank_transfer',
        gateway: 'sepay',
        sepayOrderCode: orderCode.toString(),
        status: 'pending',
        ipAddress: SepayHelper.getClientIp(req)
      });

      // Create SePay payment info with QR
      const paymentInfo = SepayHelper.createPaymentRequest({
        orderCode: orderCode,
        amount: plan.price,
        description: `Thanh toan goi ${plan.name}`,
        buyerName: userName,
        buyerEmail: userEmail
      });

      res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          orderCode: orderCode,
          amount: plan.price,
          planName: plan.name,
          bankInfo: {
            bankCode: paymentInfo.data.bankCode,
            bankName: SepayHelper.getBankName(paymentInfo.data.bankCode),
            accountNumber: paymentInfo.data.accountNumber,
            accountName: paymentInfo.data.accountName,
            transferContent: paymentInfo.data.content,
            qrCode: paymentInfo.data.qrCode
          },
          note: paymentInfo.data.note,
          expiresAt: moment().add(sepayConfig.paymentTimeout, 'minutes').toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo thanh toán'
      });
    }
  },

  /**
   * SePay check payment status (manual check)
   */
  sepayCheckPayment: async (req, res) => {
    try {
      const { orderCode } = req.params;
      const userId = req.user.id;

      // Find transaction
      const transaction = await Transaction.findOne({
        where: { sepayOrderCode: orderCode, userId }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch'
        });
      }

      // If already success, return
      if (transaction.status === 'success') {
        return res.json({
          success: true,
          paid: true,
          message: 'Giao dịch đã được xác nhận',
          data: {
            orderCode,
            status: 'success',
            amount: transaction.amount
          }
        });
      }

      // Check with SePay
      const transferContent = `EDUTECH ${orderCode}`;
      const paymentCheck = await SepayHelper.checkPaymentReceived(
        transferContent,
        transaction.amount
      );

      if (paymentCheck.paid) {
        // Update transaction
        transaction.status = 'success';
        transaction.gatewayTransactionId = paymentCheck.transaction?.id;
        transaction.gatewayResponseJson = paymentCheck.transaction;
        transaction.webhookVerified = true;
        await transaction.save();

        // Activate subscription
        const subscription = await Subscription.findByPk(transaction.subscriptionId);
        if (subscription) {
          const plan = await SubscriptionPlan.findByPk(subscription.planId);
          subscription.status = 'active';
          subscription.startDate = new Date();
          subscription.endDate = moment().add(plan.durationDays, 'days').toDate();
          subscription.paymentMethod = transaction.paymentMethod;
          await subscription.save();
        }

        // Create invoice
        const invoiceCode = `INV${moment().format('YYYYMMDD')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        await Invoice.create({
          id: uuidv4(),
          transactionId: transaction.id,
          userId: transaction.userId,
          invoiceCode,
          status: 'draft'
        });

        return res.json({
          success: true,
          paid: true,
          message: 'Thanh toán thành công! Gói dịch vụ đã được kích hoạt',
          data: {
            orderCode,
            status: 'success',
            amount: transaction.amount
          }
        });
      }

      res.json({
        success: true,
        paid: false,
        message: 'Chưa nhận được thanh toán. Vui lòng chuyển khoản theo thông tin đã cung cấp.',
        data: {
          orderCode,
          status: 'pending',
          amount: transaction.amount
        }
      });
    } catch (error) {
      console.error('Error checking payment:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra thanh toán'
      });
    }
  },

  /**
   * SePay webhook handler (if configured)
   */
  sepayWebhook: async (req, res) => {
    try {
      const webhookData = req.body;
      const signature = req.headers['x-sepay-signature'];

      // Verify signature
      const isValid = SepayHelper.verifyWebhookSignature(webhookData, signature);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      const { transaction_content, amount_in, id } = webhookData;

      // Extract order code from content
      const orderCodeMatch = transaction_content?.match(/EDUTECH\s*(\d+)/i);
      if (!orderCodeMatch) {
        return res.json({ success: true, message: 'Not a payment transaction' });
      }

      const orderCode = orderCodeMatch[1];

      // Find transaction
      const transaction = await Transaction.findOne({
        where: { sepayOrderCode: orderCode }
      });

      if (!transaction) {
        return res.json({ success: true, message: 'Transaction not found' });
      }

      // Check if already processed
      if (transaction.webhookVerified) {
        return res.json({ success: true, message: 'Already processed' });
      }

      // Verify amount
      if (Math.abs(amount_in - transaction.amount) > 100) {
        return res.json({ success: true, message: 'Amount mismatch' });
      }

      // Update transaction
      transaction.status = 'success';
      transaction.gatewayTransactionId = id;
      transaction.webhookVerified = true;
      transaction.gatewayResponseJson = webhookData;
      await transaction.save();

      // Activate subscription
      const subscription = await Subscription.findByPk(transaction.subscriptionId);
      if (subscription && subscription.status !== 'active') {
        const plan = await SubscriptionPlan.findByPk(subscription.planId);
        subscription.status = 'active';
        subscription.startDate = new Date();
        subscription.endDate = moment().add(plan.durationDays, 'days').toDate();
        subscription.paymentMethod = transaction.paymentMethod;
        await subscription.save();
      }

      return res.json({
        success: true,
        message: 'Payment processed successfully'
      });
    } catch (error) {
      console.error('Error in sepayWebhook:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Query transaction status
   */
  queryTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const userId = req.user.id;

      const transaction = await Transaction.findOne({
        where: { id: transactionId, userId },
        include: [
          {
            model: Subscription,
            as: 'subscription',
            include: [{ model: SubscriptionPlan, as: 'plan' }]
          }
        ]
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error querying transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tra cứu giao dịch'
      });
    }
  },

  /**
   * Get user's transactions
   */
  getTransactions: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const where = { userId };
      if (status) {
        where.status = status;
      }

      const transactions = await Transaction.findAndCountAll({
        where,
        include: [
          {
            model: Subscription,
            as: 'subscription',
            include: [{ model: SubscriptionPlan, as: 'plan' }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        data: transactions.rows,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(transactions.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách giao dịch'
      });
    }
  },

  /**
   * Get user's current subscription
   */
  getCurrentSubscription: async (req, res) => {
    try {
      const userId = req.user.id;

      const subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active'
        },
        include: [{ model: SubscriptionPlan, as: 'plan' }],
        order: [['createdAt', 'DESC']]
      });

      if (!subscription) {
        return res.json({
          success: true,
          data: null,
          message: 'Bạn chưa có gói dịch vụ nào'
        });
      }

      // Check if expired
      if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
        subscription.status = 'expired';
        await subscription.save();
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error getting subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin gói dịch vụ'
      });
    }
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (req, res) => {
    try {
      const userId = req.user.id;

      const subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active'
        }
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy gói dịch vụ đang hoạt động'
        });
      }

      subscription.autoRenew = false;
      subscription.status = 'cancelled';
      await subscription.save();

      res.json({
        success: true,
        message: 'Đã hủy gói dịch vụ thành công'
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi hủy gói dịch vụ'
      });
    }
  },

  /**
   * Request refund
   */
  requestRefund: async (req, res) => {
    try {
      const { transactionId, reason } = req.body;
      const userId = req.user.id;

      const transaction = await Transaction.findOne({
        where: {
          id: transactionId,
          userId,
          status: 'success'
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch hoặc giao dịch không thể hoàn tiền'
        });
      }

      // Check if already refunded
      if (transaction.status === 'refunded') {
        return res.status(400).json({
          success: false,
          message: 'Giao dịch đã được hoàn tiền'
        });
      }

      // Check refund deadline (e.g., 7 days)
      const daysSinceTransaction = moment().diff(moment(transaction.createdAt), 'days');
      if (daysSinceTransaction > 7) {
        return res.status(400).json({
          success: false,
          message: 'Đã quá thời hạn hoàn tiền (7 ngày)'
        });
      }

      // PayOS refunds are handled manually via dashboard
      // Mark transaction for refund review
      transaction.refundReason = reason;
      transaction.refundAmount = transaction.amount;
      await transaction.save();

      res.json({
        success: true,
        message: 'Yêu cầu hoàn tiền đã được ghi nhận. Admin sẽ xử lý trong vòng 24-48 giờ. PayOS yêu cầu hoàn tiền thủ công qua dashboard.'
      });
    } catch (error) {
      console.error('Error requesting refund:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi yêu cầu hoàn tiền'
      });
    }
  }
};

module.exports = paymentController;
