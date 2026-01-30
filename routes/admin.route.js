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
  getUserGrowthChart
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

module.exports = router;
