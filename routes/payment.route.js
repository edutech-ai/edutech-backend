const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const paymentValidator = require('../middlewares/payment.validator');
const { authenticate: verifyToken } = require('../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         currency:
 *           type: string
 *         durationDays:
 *           type: integer
 *         maxClasses:
 *           type: integer
 *         maxQuizzesPerMonth:
 *           type: integer
 *         maxStorageMb:
 *           type: integer
 *         hasAdvancedAi:
 *           type: boolean
 *         features:
 *           type: array
 *           items:
 *             type: string
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, processing, success, failed, refunded]
 *         paymentMethod:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @swagger
 * /api/v1/payment/plans:
 *   get:
 *     summary: Get all subscription plans
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: List of active subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 */
router.get('/plans', paymentController.getPlans);

/**
 * @swagger
 * /api/v1/payment/plans/{code}:
 *   get:
 *     summary: Get subscription plan by code
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           example: BASIC
 *         description: Plan code (FREE, BASIC, PRO, ENTERPRISE)
 *     responses:
 *       200:
 *         description: Plan details
 *       404:
 *         description: Plan not found
 */
router.get('/plans/:code', paymentValidator.planCode, paymentController.getPlanByCode);

/**
 * @swagger
 * /api/v1/payment/sepay-check/{orderCode}:
 *   get:
 *     summary: Check SePay payment status manually
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: string
 *           example: "915490702099"
 *         description: Order code from payment creation
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderCode:
 *                       type: string
 *                     status:
 *                       type: string
 *                     amount:
 *                       type: number
 *       404:
 *         description: Transaction not found
 */
router.get('/sepay-check/:orderCode', verifyToken, paymentController.sepayCheckPayment);

/**
 * @swagger
 * /api/v1/payment/sepay-webhook:
 *   post:
 *     summary: SePay webhook endpoint (called by SePay server)
 *     tags: [Payment]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               transaction_content:
 *                 type: string
 *               amount_in:
 *                 type: number
 *               bank_brand_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/sepay-webhook', paymentController.sepayWebhook);

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

/**
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
 *                 example: BASIC
 *                 description: Plan code (FREE, BASIC, PRO, ENTERPRISE)
 *     responses:
 *       200:
 *         description: Payment info with QR code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                     orderCode:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     planName:
 *                       type: string
 *                     bankInfo:
 *                       type: object
 *                       properties:
 *                         accountNumber:
 *                           type: string
 *                         accountName:
 *                           type: string
 *                         bankCode:
 *                           type: string
 *                         transferContent:
 *                           type: string
 *                         qrCode:
 *                           type: string
 *       400:
 *         description: Invalid request or already have active subscription
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/create',
  verifyToken,
  paymentValidator.createPayment,
  paymentController.createPayment
);

/**
 * @swagger
 * /api/v1/payment/subscription:
 *   get:
 *     summary: Get current user's subscription
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     planName:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     autoRenew:
 *                       type: boolean
 *       404:
 *         description: No active subscription
 */
router.get(
  '/subscription',
  verifyToken,
  paymentController.getCurrentSubscription
);

/**
 * @swagger
 * /api/v1/payment/subscription/cancel:
 *   post:
 *     summary: Cancel current subscription
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       404:
 *         description: No active subscription found
 */
router.post(
  '/subscription/cancel',
  verifyToken,
  paymentController.cancelSubscription
);

/**
 * @swagger
 * /api/v1/payment/transactions:
 *   get:
 *     summary: Get user's transaction history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed, refunded]
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *                     pagination:
 *                       type: object
 */
router.get(
  '/transactions',
  verifyToken,
  paymentValidator.getTransactions,
  paymentController.getTransactions
);

/**
 * @swagger
 * /api/v1/payment/transactions/{transactionId}:
 *   get:
 *     summary: Get transaction details by ID
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/transactions/:transactionId',
  verifyToken,
  paymentValidator.transactionId,
  paymentController.queryTransaction
);

/**
 * @swagger
 * /api/v1/payment/refund:
 *   post:
 *     summary: Request refund for a transaction
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
 *               - transactionId
 *               - reason
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Refund request submitted
 *       400:
 *         description: Invalid request or transaction cannot be refunded
 */
router.post(
  '/refund',
  verifyToken,
  paymentValidator.requestRefund,
  paymentController.requestRefund
);

module.exports = router;
