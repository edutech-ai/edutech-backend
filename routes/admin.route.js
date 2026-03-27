const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middlewares/auth');
const {
  getRevenueMetrics,
  getActiveCustomers,
  getTotalUsers,
  getAvgRevenuePerCustomer,
  getTrialUsers,
  getExamsCreated,
  getDashboardSummary,
  getRevenueChart,
  getUserGrowthChart,
  getEnterpriseCustomers,
  getIndividualCustomers,
  getCustomerDetail,
  toggleLockCustomer,
  createEnterpriseCustomer,
  getPaymentSummary,
  generatePaymentSummaryPDF,
  getTransactionReceipts,
  generateReceiptPDF
} = require('../controllers/admin.controller');


/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: Admin dashboard metrics and statistics
 */

/**
 * @swagger
 * /api/v1/admin/dashboard/summary:
 *   get:
 *     summary: Get all dashboard metrics in one call
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
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
 *                     revenue:
 *                       type: object
 *                     activeCustomers:
 *                       type: object
 *                     totalUsers:
 *                       type: object
 *                     avgRevenuePerCustomer:
 *                       type: object
 *                     trialUsers:
 *                       type: object
 *                     examsCreated:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/summary', authenticate, authorizeAdmin, getDashboardSummary);

/**
 * @swagger
 * /api/v1/admin/dashboard/revenue-metrics:
 *   get:
 *     summary: Get monthly recurring revenue metrics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue metrics retrieved successfully
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
 *                     currentMonth:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         period:
 *                           type: string
 *                     lastMonth:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                         period:
 *                           type: string
 *                     changePercent:
 *                       type: number
 *                     currency:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/revenue-metrics', authenticate, authorizeAdmin, getRevenueMetrics);

/**
 * @swagger
 * /api/v1/admin/dashboard/active-customers:
 *   get:
 *     summary: Get active customers count
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active customers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/active-customers', authenticate, authorizeAdmin, getActiveCustomers);

/**
 * @swagger
 * /api/v1/admin/dashboard/total-users:
 *   get:
 *     summary: Get total users count with breakdown
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/total-users', authenticate, authorizeAdmin, getTotalUsers);

/**
 * @swagger
 * /api/v1/admin/dashboard/avg-revenue-per-customer:
 *   get:
 *     summary: Get average revenue per customer
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Average revenue retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/avg-revenue-per-customer', authenticate, authorizeAdmin, getAvgRevenuePerCustomer);

/**
 * @swagger
 * /api/v1/admin/dashboard/trial-users:
 *   get:
 *     summary: Get trial users and potential revenue
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/trial-users', authenticate, authorizeAdmin, getTrialUsers);

/**
 * @swagger
 * /api/v1/admin/dashboard/exams-created:
 *   get:
 *     summary: Get exams created statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exams statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/exams-created', authenticate, authorizeAdmin, getExamsCreated);

/**
 * @swagger
 * /api/v1/admin/dashboard/revenue-chart:
 *   get:
 *     summary: Get revenue chart data for dashboard visualization
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 3months, 1year]
 *           default: 30days
 *         description: Time period for chart data
 *     responses:
 *       200:
 *         description: Revenue chart data retrieved successfully
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
 *                     period:
 *                       type: string
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           revenue:
 *                             type: number
 *                           transactions:
 *                             type: integer
 *                     total:
 *                       type: number
 *                     average:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/revenue-chart', authenticate, authorizeAdmin, getRevenueChart);

/**
 * @swagger
 * /api/v1/admin/dashboard/user-growth-chart:
 *   get:
 *     summary: Get user growth chart data for dashboard visualization
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 3months, 1year]
 *           default: 30days
 *         description: Time period for chart data
 *     responses:
 *       200:
 *         description: User growth chart data retrieved successfully
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
 *                     period:
 *                       type: string
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           newUsers:
 *                             type: integer
 *                           totalUsers:
 *                             type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalNewUsers:
 *                           type: integer
 *                         avgNewUsersPerDay:
 *                           type: number
 *                         currentTotal:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard/user-growth-chart', authenticate, authorizeAdmin, getUserGrowthChart);

/**
 * @swagger
 * tags:
 *   name: Admin Customers
 *   description: Admin customer management
 */

/**
 * @swagger
 * /api/v1/admin/customers/enterprise:
 *   get:
 *     summary: Get enterprise customers (teachers with active subscription)
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Enterprise customers retrieved successfully
 *   post:
 *     summary: Create an enterprise customer account
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, plan_id]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               plan_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
 */
router.get('/customers/enterprise', authenticate, authorizeAdmin, getEnterpriseCustomers);
router.post('/customers/enterprise', authenticate, authorizeAdmin, createEnterpriseCustomer);

/**
 * @swagger
 * /api/v1/admin/customers/individual:
 *   get:
 *     summary: Get individual customers (teachers without active subscription)
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Individual customers retrieved successfully
 */
router.get('/customers/individual', authenticate, authorizeAdmin, getIndividualCustomers);

/**
 * @swagger
 * /api/v1/admin/customers/{id}:
 *   get:
 *     summary: Get customer detail with stats
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer detail retrieved successfully
 *       404:
 *         description: Customer not found
 *
 * /api/v1/admin/customers/{id}/lock:
 *   patch:
 *     summary: Toggle lock/unlock customer account
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account lock status toggled
 *       404:
 *         description: Customer not found
 */
router.get('/customers/:id', authenticate, authorizeAdmin, getCustomerDetail);
router.patch('/customers/:id/lock', authenticate, authorizeAdmin, toggleLockCustomer);

// ─── Payment Statement Routes ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/payment/summary:
 *   get:
 *     summary: Get paid customer count, total revenue & demographics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date filter (inclusive)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date filter (inclusive)
 *     responses:
 *       200:
 *         description: Payment summary data
 * /api/v1/admin/payment/summary/pdf:
 *   get:
 *     summary: Download PDF report of payment summary & demographics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/payment/summary', authenticate, authorizeAdmin, getPaymentSummary);
router.get('/payment/summary/pdf', authenticate, authorizeAdmin, generatePaymentSummaryPDF);

/**
 * @swagger
 * /api/v1/admin/payment/receipts:
 *   get:
 *     summary: Get paginated transaction receipts with customer identification
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of transaction receipts with customer info (email, name, userId, gatewayTransactionId)
 */
router.get('/payment/receipts', authenticate, authorizeAdmin, getTransactionReceipts);

/**
 * @swagger
 * /api/v1/admin/payment/receipts/pdf:
 *   get:
 *     summary: Download PDF report of all transaction receipts
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/payment/receipts/pdf', authenticate, authorizeAdmin, generateReceiptPDF);

module.exports = router;

