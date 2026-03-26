const db = require('../config/database');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Get Monthly Recurring Revenue metrics
 * @route   GET /api/v1/admin/dashboard/revenue-metrics
 * @access  Private/Admin
 */
const getRevenueMetrics = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // Get current month revenue
    const [currentMonthResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as revenue
       FROM transactions
       WHERE status = 'success'
       AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [currentMonth]
    );

    // Get last month revenue
    const [lastMonthResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as revenue
       FROM transactions
       WHERE status = 'success'
       AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [lastMonthStr]
    );

    const currentRevenue = parseFloat(currentMonthResult[0].revenue);
    const lastRevenue = parseFloat(lastMonthResult[0].revenue);
    const changePercent = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        currentMonth: {
          revenue: currentRevenue,
          period: currentMonth
        },
        lastMonth: {
          revenue: lastRevenue,
          period: lastMonthStr
        },
        changePercent: parseFloat(changePercent),
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Get revenue metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue metrics',
      error: error.message
    });
  }
};

/**
 * @desc    Get Active Customers count
 * @route   GET /api/v1/admin/dashboard/active-customers
 * @access  Private/Admin
 */
const getActiveCustomers = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // Get current active customers
    const [currentResult] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM subscriptions
       WHERE status = 'active'
       AND (end_date IS NULL OR end_date >= CURDATE())`
    );

    // Get last month active customers (snapshot at end of last month)
    const lastMonthEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    const [lastMonthResult] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM subscriptions
       WHERE status = 'active'
       AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)`,
      [lastMonthEndDate, lastMonthEndDate]
    );

    const currentCount = parseInt(currentResult[0].count);
    const lastMonthCount = parseInt(lastMonthResult[0].count);
    const changePercent = lastMonthCount > 0
      ? ((currentCount - lastMonthCount) / lastMonthCount * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        activeCount: currentCount,
        lastMonthCount: lastMonthCount,
        changePercent: parseFloat(changePercent)
      }
    });
  } catch (error) {
    console.error('Get active customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active customers',
      error: error.message
    });
  }
};

/**
 * @desc    Get Total Users count
 * @route   GET /api/v1/admin/dashboard/total-users
 * @access  Private/Admin
 */
const getTotalUsers = async (req, res) => {
  try {
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const lastMonthEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    // Get current total users
    const [currentResult] = await db.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN role = 'TEACHER' THEN 1 ELSE 0 END) as teachers,
              SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as students,
              SUM(CASE WHEN role = 'TUTOR' THEN 1 ELSE 0 END) as tutors
       FROM users
       WHERE is_deleted = FALSE`
    );

    // Get last month total users
    const [lastMonthResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM users
       WHERE is_deleted = FALSE
       AND created_at <= ?`,
      [lastMonthEndDate]
    );

    const totalUsers = parseInt(currentResult[0].total);
    const lastMonthUsers = parseInt(lastMonthResult[0].total);
    const changePercent = lastMonthUsers > 0
      ? ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers,
        lastMonthUsers: lastMonthUsers,
        changePercent: parseFloat(changePercent),
        breakdown: {
          teachers: parseInt(currentResult[0].teachers || 0),
          students: parseInt(currentResult[0].students || 0),
          tutors: parseInt(currentResult[0].tutors || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get total users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get total users',
      error: error.message
    });
  }
};

/**
 * @desc    Get Average Revenue Per Customer
 * @route   GET /api/v1/admin/dashboard/avg-revenue-per-customer
 * @access  Private/Admin
 */
const getAvgRevenuePerCustomer = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // Current month
    const [currentRevenue] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as revenue
       FROM transactions
       WHERE status = 'success'
       AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [currentMonth]
    );

    const [currentCustomers] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM subscriptions
       WHERE status = 'active'
       AND (end_date IS NULL OR end_date >= CURDATE())`
    );

    // Last month
    const [lastRevenue] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as revenue
       FROM transactions
       WHERE status = 'success'
       AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
      [lastMonthStr]
    );

    const lastMonthEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    const [lastCustomers] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM subscriptions
       WHERE status = 'active'
       AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)`,
      [lastMonthEndDate, lastMonthEndDate]
    );

    const currentCustomerCount = parseInt(currentCustomers[0].count);
    const lastCustomerCount = parseInt(lastCustomers[0].count);
    
    const currentAvg = currentCustomerCount > 0 
      ? parseFloat(currentRevenue[0].revenue) / currentCustomerCount
      : 0;
    
    const lastAvg = lastCustomerCount > 0
      ? parseFloat(lastRevenue[0].revenue) / lastCustomerCount
      : 0;

    const changePercent = lastAvg > 0
      ? ((currentAvg - lastAvg) / lastAvg * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        avgRevenue: parseFloat(currentAvg.toFixed(2)),
        lastMonthAvg: parseFloat(lastAvg.toFixed(2)),
        changePercent: parseFloat(changePercent)
      }
    });
  } catch (error) {
    console.error('Get avg revenue per customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get average revenue per customer',
      error: error.message
    });
  }
};

/**
 * @desc    Get Trial Users
 * @route   GET /api/v1/admin/dashboard/trial-users
 * @access  Private/Admin
 */
const getTrialUsers = async (req, res) => {
  try {
    // Get users with pending subscriptions or trial subscriptions
    const [trialUsers] = await db.query(
      `SELECT 
        u.id,
        u.email,
        s.end_date as trialEndsAt,
        sp.price as potentialRevenue
       FROM users u
       INNER JOIN subscriptions s ON u.id = s.user_id
       INNER JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE u.is_deleted = FALSE
       AND s.status = 'pending'
       AND s.end_date >= CURDATE()
       ORDER BY s.end_date ASC
       LIMIT 10`
    );

    const [potentialRevenueResult] = await db.query(
      `SELECT COALESCE(SUM(sp.price), 0) as total
       FROM subscriptions s
       INNER JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.status = 'pending'
       AND s.end_date >= CURDATE()`
    );

    res.json({
      success: true,
      data: {
        trialCount: trialUsers.length,
        potentialRevenue: parseFloat(potentialRevenueResult[0].total),
        users: trialUsers.map(user => ({
          id: user.id,
          email: user.email,
          trialEndsAt: user.trialEndsAt,
          potentialRevenue: parseFloat(user.potentialRevenue || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Get trial users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trial users',
      error: error.message
    });
  }
};

/**
 * @desc    Get Exams Created statistics
 * @route   GET /api/v1/admin/dashboard/exams-created
 * @access  Private/Admin
 */
const getExamsCreated = async (req, res) => {
  try {
    // Total exams
    const [totalResult] = await db.query(
      `SELECT COUNT(*) as total
       FROM quizzes
       WHERE is_deleted = FALSE`
    );

    // Breakdown by status
    const [breakdown] = await db.query(
      `SELECT 
        status,
        COUNT(*) as count
       FROM quizzes
       WHERE is_deleted = FALSE
       GROUP BY status`
    );

    // By month (last 12 months)
    const [byMonth] = await db.query(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count
       FROM quizzes
       WHERE is_deleted = FALSE
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC`
    );

    // Convert breakdown to object
    const breakdownObj = {};
    breakdown.forEach(item => {
      breakdownObj[item.status] = parseInt(item.count);
    });

    res.json({
      success: true,
      data: {
        totalExams: parseInt(totalResult[0].total),
        breakdown: breakdownObj,
        byMonth: byMonth.map(item => ({
          month: item.month,
          count: parseInt(item.count)
        }))
      }
    });
  } catch (error) {
    console.error('Get exams created error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exams created statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get Dashboard Summary (All metrics in one call)
 * @route   GET /api/v1/admin/dashboard/summary
 * @access  Private/Admin
 */
const getDashboardSummary = async (req, res) => {
  try {
    // Execute all queries in parallel for better performance
    const [
      revenueData,
      activeCustomersData,
      totalUsersData,
      avgRevenueData,
      trialUsersData,
      examsData
    ] = await Promise.all([
      getRevenueData(),
      getActiveCustomersData(),
      getTotalUsersData(),
      getAvgRevenueData(),
      getTrialUsersData(),
      getExamsData()
    ]);

    res.json({
      success: true,
      data: {
        revenue: revenueData,
        activeCustomers: activeCustomersData,
        totalUsers: totalUsersData,
        avgRevenuePerCustomer: avgRevenueData,
        trialUsers: trialUsersData,
        examsCreated: examsData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard summary',
      error: error.message
    });
  }
};

// Helper functions for getDashboardSummary
async function getRevenueData() {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const [currentMonthResult] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as revenue FROM transactions WHERE status = 'success' AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
    [currentMonth]
  );
  const [lastMonthResult] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as revenue FROM transactions WHERE status = 'success' AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
    [lastMonthStr]
  );

  const currentRevenue = parseFloat(currentMonthResult[0].revenue);
  const lastRevenue = parseFloat(lastMonthResult[0].revenue);
  const changePercent = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : 0;

  return {
    currentMonth: { revenue: currentRevenue, period: currentMonth },
    lastMonth: { revenue: lastRevenue, period: lastMonthStr },
    changePercent: parseFloat(changePercent),
    currency: 'USD'
  };
}

async function getActiveCustomersData() {
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1);
  const lastMonthEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

  const [currentResult] = await db.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status = 'active' AND (end_date IS NULL OR end_date >= CURDATE())`
  );
  const [lastMonthResult] = await db.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status = 'active' AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`,
    [lastMonthEndDate, lastMonthEndDate]
  );

  const currentCount = parseInt(currentResult[0].count);
  const lastMonthCount = parseInt(lastMonthResult[0].count);
  const changePercent = lastMonthCount > 0 ? ((currentCount - lastMonthCount) / lastMonthCount * 100).toFixed(1) : 0;

  return {
    activeCount: currentCount,
    lastMonthCount: lastMonthCount,
    changePercent: parseFloat(changePercent)
  };
}

async function getTotalUsersData() {
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1);
  const lastMonthEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

  const [currentResult] = await db.query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN role = 'TEACHER' THEN 1 ELSE 0 END) as teachers, SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as students, SUM(CASE WHEN role = 'TUTOR' THEN 1 ELSE 0 END) as tutors FROM users WHERE is_deleted = FALSE`
  );
  const [lastMonthResult] = await db.query(
    `SELECT COUNT(*) as total FROM users WHERE is_deleted = FALSE AND created_at <= ?`,
    [lastMonthEndDate]
  );

  const totalUsers = parseInt(currentResult[0].total);
  const lastMonthUsers = parseInt(lastMonthResult[0].total);
  const changePercent = lastMonthUsers > 0 ? ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0;

  return {
    totalUsers: totalUsers,
    lastMonthUsers: lastMonthUsers,
    changePercent: parseFloat(changePercent),
    breakdown: {
      teachers: parseInt(currentResult[0].teachers || 0),
      students: parseInt(currentResult[0].students || 0),
      tutors: parseInt(currentResult[0].tutors || 0)
    }
  };
}

async function getAvgRevenueData() {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const [currentRevenue] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as revenue FROM transactions WHERE status = 'success' AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
    [currentMonth]
  );
  const [currentCustomers] = await db.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status = 'active' AND (end_date IS NULL OR end_date >= CURDATE())`
  );
  const [lastRevenue] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as revenue FROM transactions WHERE status = 'success' AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
    [lastMonthStr]
  );
  const lastMonthEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
  const [lastCustomers] = await db.query(
    `SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status = 'active' AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`,
    [lastMonthEndDate, lastMonthEndDate]
  );

  const currentCustomerCount = parseInt(currentCustomers[0].count);
  const lastCustomerCount = parseInt(lastCustomers[0].count);
  const currentAvg = currentCustomerCount > 0 ? parseFloat(currentRevenue[0].revenue) / currentCustomerCount : 0;
  const lastAvg = lastCustomerCount > 0 ? parseFloat(lastRevenue[0].revenue) / lastCustomerCount : 0;
  const changePercent = lastAvg > 0 ? ((currentAvg - lastAvg) / lastAvg * 100).toFixed(1) : 0;

  return {
    avgRevenue: parseFloat(currentAvg.toFixed(2)),
    lastMonthAvg: parseFloat(lastAvg.toFixed(2)),
    changePercent: parseFloat(changePercent)
  };
}

async function getTrialUsersData() {
  const [trialUsers] = await db.query(
    `SELECT u.id, u.email, s.end_date as trialEndsAt, sp.price as potentialRevenue 
     FROM users u 
     INNER JOIN subscriptions s ON u.id = s.user_id 
     INNER JOIN subscription_plans sp ON s.plan_id = sp.id 
     WHERE u.is_deleted = FALSE AND s.status = 'pending' AND s.end_date >= CURDATE() 
     ORDER BY s.end_date ASC LIMIT 10`
  );
  const [potentialRevenueResult] = await db.query(
    `SELECT COALESCE(SUM(sp.price), 0) as total FROM subscriptions s INNER JOIN subscription_plans sp ON s.plan_id = sp.id WHERE s.status = 'pending' AND s.end_date >= CURDATE()`
  );

  return {
    trialCount: trialUsers.length,
    potentialRevenue: parseFloat(potentialRevenueResult[0].total),
    users: trialUsers.map(user => ({
      id: user.id,
      email: user.email,
      trialEndsAt: user.trialEndsAt,
      potentialRevenue: parseFloat(user.potentialRevenue || 0)
    }))
  };
}

async function getExamsData() {
  const [totalResult] = await db.query(
    `SELECT COUNT(*) as total FROM quizzes WHERE is_deleted = FALSE`
  );
  const [breakdown] = await db.query(
    `SELECT status, COUNT(*) as count FROM quizzes WHERE is_deleted = FALSE GROUP BY status`
  );
  const [byMonth] = await db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM quizzes WHERE is_deleted = FALSE AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month DESC`
  );

  const breakdownObj = {};
  breakdown.forEach(item => {
    breakdownObj[item.status] = parseInt(item.count);
  });

  return {
    totalExams: parseInt(totalResult[0].total),
    breakdown: breakdownObj,
    byMonth: byMonth.map(item => ({
      month: item.month,
      count: parseInt(item.count)
    }))
  };
}

/**
 * @desc    Get Revenue Chart Data
 * @route   GET /api/v1/admin/dashboard/revenue-chart
 * @access  Private/Admin
 */
const getRevenueChart = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    let days = 30;
    if (period === '7days') days = 7;
    else if (period === '3months') days = 90;
    else if (period === '1year') days = 365;

    // Get daily revenue data
    const [revenueData] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as transactions
       FROM transactions
       WHERE status = 'success'
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    // Calculate totals
    const total = revenueData.reduce((sum, item) => sum + parseFloat(item.revenue), 0);
    const average = revenueData.length > 0 ? total / revenueData.length : 0;

    res.json({
      success: true,
      data: {
        period,
        data: revenueData.map(item => ({
          date: item.date,
          revenue: parseFloat(item.revenue),
          transactions: parseInt(item.transactions)
        })),
        total: parseFloat(total.toFixed(2)),
        average: parseFloat(average.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue chart data',
      error: error.message
    });
  }
};

/**
 * @desc    Get User Growth Chart Data
 * @route   GET /api/v1/admin/dashboard/user-growth-chart
 * @access  Private/Admin
 */
const getUserGrowthChart = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    let days = 30;
    if (period === '7days') days = 7;
    else if (period === '3months') days = 90;
    else if (period === '1year') days = 365;

    // Get daily new users
    const [newUsersData] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as newUsers
       FROM users
       WHERE is_deleted = FALSE
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    // Get total users count for each day
    const [totalUsersData] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        (
          SELECT COUNT(*) 
          FROM users 
          WHERE is_deleted = FALSE 
          AND created_at <= DATE(u.created_at)
        ) as totalUsers
       FROM users u
       WHERE u.is_deleted = FALSE
       AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    // Merge data by date
    const dataMap = new Map();
    
    newUsersData.forEach(item => {
      dataMap.set(item.date.toISOString().split('T')[0], {
        date: item.date,
        newUsers: parseInt(item.newUsers),
        totalUsers: 0
      });
    });

    totalUsersData.forEach(item => {
      const dateStr = item.date.toISOString().split('T')[0];
      if (dataMap.has(dateStr)) {
        dataMap.get(dateStr).totalUsers = parseInt(item.totalUsers);
      }
    });

    const data = Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Calculate summary
    const totalNewUsers = data.reduce((sum, item) => sum + item.newUsers, 0);
    const avgNewUsersPerDay = data.length > 0 ? totalNewUsers / data.length : 0;

    res.json({
      success: true,
      data: {
        period,
        data: data.map(item => ({
          date: item.date,
          newUsers: item.newUsers,
          totalUsers: item.totalUsers
        })),
        summary: {
          totalNewUsers,
          avgNewUsersPerDay: parseFloat(avgNewUsersPerDay.toFixed(1)),
          currentTotal: data.length > 0 ? data[data.length - 1].totalUsers : 0
        }
      }
    });
  } catch (error) {
    console.error('Get user growth chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user growth chart data',
      error: error.message
    });
  }
};

// ─── Customer Management ─────

/**
 * Enterprise customers = subscription where plan code = 'ENTERPRISE'
 */
const getEnterpriseCustomers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = `u.role = 'TEACHER' AND u.is_deleted = FALSE`;
    const params = [];

    if (search) {
      where += ` AND (u.email LIKE ? OR p.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status && status !== 'all') {
      where += ` AND u.status = ?`;
      params.push(status);
    }

    const [customers] = await db.query(
      `SELECT
        u.id, u.email, u.status, u.created_at,
        p.name, p.avatar_url,
        ANY_VALUE(sp.name) AS plan_name, ANY_VALUE(sp.price) AS plan_price,
        ANY_VALUE(s.start_date) AS start_date, ANY_VALUE(s.end_date) AS end_date,
        ANY_VALUE(s.status) AS subscription_status,
        (SELECT COUNT(*) FROM quizzes q WHERE q.teacher_id = u.id AND q.is_deleted = FALSE) AS quizzes_count,
        (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) AS classrooms_count
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       INNER JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
       INNER JOIN subscription_plans sp ON s.plan_id = sp.id AND sp.code = 'ENTERPRISE'
       WHERE ${where}
       GROUP BY u.id, u.email, u.status, u.created_at, p.name, p.avatar_url
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE ${where}
       AND EXISTS (
         SELECT 1 FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.user_id = u.id AND s.status = 'active' AND sp.code = 'ENTERPRISE'
       )`,
      params
    );

    res.json({
      success: true,
      data: customers,
      total: parseInt(countResult[0].total),
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(parseInt(countResult[0].total) / limitNum)
    });
  } catch (error) {
    console.error('getEnterpriseCustomers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách khách hàng doanh nghiệp', error: error.message });
  }
};

/**
 * Individual customers = users WITHOUT an active ENTERPRISE subscription
 */
const getIndividualCustomers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = `u.role = 'TEACHER' AND u.is_deleted = FALSE`;
    const params = [];

    if (search) {
      where += ` AND (u.email LIKE ? OR p.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status && status !== 'all') {
      where += ` AND u.status = ?`;
      params.push(status);
    }

    const [customers] = await db.query(
      `SELECT
        u.id, u.email, u.status, u.created_at,
        p.name, p.avatar_url,
        (SELECT COUNT(*) FROM quizzes q WHERE q.teacher_id = u.id AND q.is_deleted = FALSE) AS quizzes_count,
        (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) AS classrooms_count
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE ${where}
       AND NOT EXISTS (
         SELECT 1 FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.user_id = u.id AND s.status = 'active' AND sp.code = 'ENTERPRISE'
       )
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE ${where}
       AND NOT EXISTS (
         SELECT 1 FROM subscriptions s
         JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE s.user_id = u.id AND s.status = 'active' AND sp.code = 'ENTERPRISE'
       )`,
      params
    );

    res.json({
      success: true,
      data: customers,
      total: parseInt(countResult[0].total),
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(parseInt(countResult[0].total) / limitNum)
    });
  } catch (error) {
    console.error('getIndividualCustomers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách khách hàng cá nhân', error: error.message });
  }
};

const getCustomerDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT
        u.id, u.email, u.status, u.created_at,
        p.name, p.avatar_url, p.address,
        ANY_VALUE(sp.name) AS plan_name, ANY_VALUE(sp.price) AS plan_price,
        ANY_VALUE(s.start_date) AS start_date, ANY_VALUE(s.end_date) AS end_date,
        ANY_VALUE(s.status) AS subscription_status,
        (SELECT COUNT(*) FROM quizzes q WHERE q.teacher_id = u.id AND q.is_deleted = FALSE) AS quizzes_count,
        (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) AS classrooms_count,
        (SELECT COUNT(DISTINCT cs.student_id) FROM classrooms c JOIN classroom_students cs ON c.id = cs.classroom_id WHERE c.teacher_id = u.id) AS students_count
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE u.id = ? AND u.is_deleted = FALSE
       GROUP BY u.id, u.email, u.status, u.created_at, p.name, p.avatar_url, p.address`,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getCustomerDetail error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin khách hàng', error: error.message });
  }
};

const toggleLockCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT id, status FROM users WHERE id = ? AND is_deleted = FALSE`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    const newStatus = rows[0].status === 'locked' ? 'active' : 'locked';
    await db.query(`UPDATE users SET status = ? WHERE id = ?`, [newStatus, id]);

    res.json({ success: true, message: newStatus === 'locked' ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản', status: newStatus });
  } catch (error) {
    console.error('toggleLockCustomer error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thực hiện thao tác', error: error.message });
  }
};

/**
 * Create enterprise customer
 */
const createEnterpriseCustomer = async (req, res) => {
  try {
    const { email, name, plan_id, password } = req.body;
    if (!email || !plan_id || !password) {
      return res.status(400).json({ success: false, message: 'email, password và plan_id là bắt buộc' });
    }

    const bcrypt = require('bcryptjs');
    const { v7: uuidv7 } = require('uuid');

    // Check email exists
    const [existing] = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing[0]) return res.status(409).json({ success: false, message: 'Email đã tồn tại' });

    const userId = uuidv7();
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (id, email, password_hash, role, is_verified) VALUES (?, ?, ?, 'TEACHER', TRUE)`,
      [userId, email, hashedPassword]
    );

    if (name) {
      await db.query(
        `INSERT INTO user_profiles (user_id, name) VALUES (?, ?)`,
        [userId, name]
      );
    }

    const subId = uuidv7();
    await db.query(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, start_date) VALUES (?, ?, ?, 'active', CURDATE())`,
      [subId, userId, plan_id]
    );

    res.status(201).json({ success: true, message: 'Tạo khách hàng doanh nghiệp thành công', data: { id: userId, email, name } });
  } catch (error) {
    console.error('createEnterpriseCustomer error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo khách hàng', error: error.message });
  }
};

module.exports = {
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
};

// ─── Payment Statement APIs ──────────────────────────────────────────────────

/**
 * @desc    Get paid customer count, total revenue & demographics
 * @route   GET /api/v1/admin/payment/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @access  Private/Admin
 */
async function getPaymentSummary(req, res) {
  try {
    const { from, to } = req.query;

    // Build date filter
    let dateFilter = `t.status = 'success'`;
    const params = [];
    if (from) {
      dateFilter += ` AND t.created_at >= ?`;
      params.push(from);
    }
    if (to) {
      dateFilter += ` AND t.created_at <= ?`;
      params.push(`${to} 23:59:59`);
    }

    // 1) Total paid customers & revenue
    const [summaryRows] = await db.query(
      `SELECT
         COUNT(DISTINCT t.user_id)  AS paid_customer_count,
         COALESCE(SUM(t.amount), 0) AS total_revenue
       FROM transactions t
       WHERE ${dateFilter}`,
      params
    );

    // 2) Demographics by gender
    const [genderRows] = await db.query(
      `SELECT
         COALESCE(up.gender, 'unknown') AS gender,
         COUNT(DISTINCT t.user_id)      AS count
       FROM transactions t
       LEFT JOIN user_profiles up ON t.user_id = up.user_id
       WHERE ${dateFilter}
       GROUP BY COALESCE(up.gender, 'unknown')`,
      params
    );

    // 3) Demographics by age range
    const [ageRows] = await db.query(
      `SELECT 
         CASE 
           WHEN age < 18 THEN '<18'
           WHEN age BETWEEN 18 AND 24 THEN '18-24'
           WHEN age BETWEEN 25 AND 34 THEN '25-34'
           WHEN age BETWEEN 35 AND 44 THEN '35-44'
           WHEN age >= 45 THEN '45+'
           ELSE 'unknown'
         END AS age_range,
         COUNT(DISTINCT user_id) AS count
       FROM (
         SELECT 
           t.user_id,
           TIMESTAMPDIFF(YEAR, up.date_of_birth, CURDATE()) AS age
         FROM transactions t
         LEFT JOIN user_profiles up ON t.user_id = up.user_id
         WHERE ${dateFilter}
       ) AS ages
       GROUP BY age_range`,
      params
    );

    // 4) Demographics by job (role, excluding ADMIN)
    const [jobRows] = await db.query(
      `SELECT
         u.role                    AS job,
         COUNT(DISTINCT t.user_id) AS count
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE ${dateFilter} AND u.role != 'ADMIN'
       GROUP BY u.role`,
      params
    );

    // 5) Demographics by subscription plan
    const [planRows] = await db.query(
      `SELECT
         sp.code                    AS plan_code,
         sp.name                    AS plan_name,
         COUNT(DISTINCT t.user_id)  AS count,
         COALESCE(SUM(t.amount), 0) AS revenue
       FROM transactions t
       JOIN subscriptions s   ON t.subscription_id = s.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE ${dateFilter}
       GROUP BY sp.code, sp.name`,
      params
    );

    // Build response
    const toObj = (rows, keyField, valueField = 'count') =>
      rows.reduce((acc, r) => {
        acc[r[keyField]] = parseInt(r[valueField]);
        return acc;
      }, {});

    const planStats = planRows.reduce((acc, r) => {
      acc[r.plan_code] = {
        name: r.plan_name,
        customerCount: parseInt(r.count),
        revenue: parseFloat(r.revenue)
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        paidCustomerCount: parseInt(summaryRows[0].paid_customer_count),
        totalRevenue: parseFloat(summaryRows[0].total_revenue),
        currency: 'VND',
        period: { from: from || null, to: to || null },
        demographics: {
          age:    toObj(ageRows,    'age_range'),
          gender: toObj(genderRows, 'gender'),
          job:    toObj(jobRows,    'job'),
          plan:   planStats
        }
      }
    });
  } catch (error) {
    console.error('getPaymentSummary error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment summary', error: error.message });
  }
}

/**
 * @desc    Generate a PDF report of payment summary & demographics
 * @route   GET /api/v1/admin/payment/summary/pdf?from=&to=
 * @access  Private/Admin
 */
async function generatePaymentSummaryPDF(req, res) {
  try {
    const { from, to } = req.query;

    // ── Build filters & params ──────────────────────────────────────────────
    let dateFilter = `t.status = 'success'`;
    const params = [];
    if (from) { dateFilter += ` AND t.created_at >= ?`; params.push(from); }
    if (to)   { dateFilter += ` AND t.created_at <= ?`; params.push(`${to} 23:59:59`); }

    // ── 1) Fetch Financial Totals ──────────────────────────────────────────────
    const [summaryRows] = await db.query(
      `SELECT COUNT(DISTINCT t.user_id) AS paid_count, COALESCE(SUM(t.amount), 0) AS total_revenue
       FROM transactions t WHERE ${dateFilter}`,
      params
    );
    const paidCount    = parseInt(summaryRows[0].paid_count);
    const totalRevenue = parseFloat(summaryRows[0].total_revenue);

    // ── 2) Fetch Demographics (Age, Gender, Job, Plan) ─────────────────────────
    const [genderRows] = await db.query(
      `SELECT COALESCE(up.gender, 'unknown') AS gender, COUNT(DISTINCT t.user_id) AS count
       FROM transactions t LEFT JOIN user_profiles up ON t.user_id = up.user_id
       WHERE ${dateFilter} GROUP BY gender`, params
    );

    const [ageRows] = await db.query(
      `SELECT 
         CASE 
           WHEN age < 18 THEN '< 18'
           WHEN age BETWEEN 18 AND 24 THEN '18 - 24'
           WHEN age BETWEEN 25 AND 34 THEN '25 - 34'
           WHEN age BETWEEN 35 AND 44 THEN '35 - 44'
           WHEN age >= 45 THEN '45+'
           ELSE 'unknown'
         END AS label,
         COUNT(DISTINCT user_id) AS count
       FROM (
         SELECT t.user_id, TIMESTAMPDIFF(YEAR, up.date_of_birth, CURDATE()) AS age
         FROM transactions t LEFT JOIN user_profiles up ON t.user_id = up.user_id
         WHERE ${dateFilter}
       ) AS ages
       GROUP BY label`, params
    );

    const [jobRows] = await db.query(
      `SELECT u.role AS label, COUNT(DISTINCT t.user_id) AS count
       FROM transactions t JOIN users u ON t.user_id = u.id
       WHERE ${dateFilter} AND u.role != 'ADMIN' GROUP BY u.role`, params
    );

    const [planRows] = await db.query(
      `SELECT sp.name AS label, COUNT(DISTINCT t.user_id) AS count, COALESCE(SUM(t.amount), 0) AS revenue
       FROM transactions t
       JOIN subscriptions s ON t.subscription_id = s.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE ${dateFilter} GROUP BY sp.name`, params
    );

    // ── 3) Start PDF Generation ──────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `payment-summary-${from || 'all'}-${to || 'now'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Register Vietnamese fonts
    const fontPathRegular = path.join(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
    const fontPathBold    = path.join(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
    if (fs.existsSync(fontPathRegular)) doc.registerFont('Roboto-Regular', fontPathRegular);
    if (fs.existsSync(fontPathBold))    doc.registerFont('Roboto-Bold',    fontPathBold);

    const PAGE_WIDTH = doc.page.width - 80;
    const COLOR_PRIMARY = '#1a56db';
    const COLOR_LIGHT   = '#f8faff';
    const COLOR_BORDER  = '#e5e7eb';
    const COLOR_GRAY    = '#6b7280';

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fillColor(COLOR_PRIMARY).fontSize(20).font('Roboto-Bold').text('BÁO CÁO TỔNG HỢP THANH TOÁN', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor(COLOR_GRAY).fontSize(10).font('Roboto-Regular')
       .text(`Ngày xuất: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`, { align: 'center' });
    
    const periodStr = (from || to) ? `Kỳ báo cáo: ${from || 'Toàn bộ'} ➔ ${to || 'Hiện tại'}` : 'Kỳ báo cáo: Toàn thời gian';
    doc.text(periodStr, { align: 'center' });
    doc.moveDown(1.5);

    // ── Financial Box ────────────────────────────────────────────────────────
    const boxY = doc.y;
    doc.rect(40, boxY, PAGE_WIDTH, 75).fill(COLOR_LIGHT).stroke(COLOR_BORDER);
    
    doc.fillColor(COLOR_PRIMARY).fontSize(11).font('Roboto-Bold')
       .text('TỔNG QUAN TÀI CHÍNH', 60, boxY + 15);
    
    doc.fillColor('#111827').fontSize(14).font('Roboto-Bold')
       .text(`${totalRevenue.toLocaleString('vi-VN')} VND`, 60, boxY + 36);
    doc.fontSize(9).font('Roboto-Regular').fillColor(COLOR_GRAY).text('Tổng doanh thu thuần', 60, boxY + 54);

    doc.fillColor('#111827').fontSize(18).font('Roboto-Bold')
       .text(`${paidCount}`, 260, boxY + 32, { width: 220, align: 'center' });
    doc.fontSize(9).font('Roboto-Regular').fillColor(COLOR_GRAY).text('Khách hàng đã thanh toán', 260, boxY + 54, { width: 220, align: 'center' });
    
    doc.moveDown(4.5);

    // ── Visualization Helpers ────────────────────────────────────────────────
    const BAR_MAX_W = 150;
    const drawSectionHeader = (title) => {
      // Check for page break
      if (doc.y > doc.page.height - 150) doc.addPage();
      
      doc.moveDown(1.5);
      doc.fillColor(COLOR_PRIMARY).fontSize(12).font('Roboto-Bold').text(title, 40);
      doc.moveTo(40, doc.y + 2).lineTo(40 + PAGE_WIDTH, doc.y + 2).strokeColor(COLOR_BORDER).stroke();
      doc.moveDown(0.8);
    };

    const drawProgressBar = (label, count, total, color = '#3b82f6') => {
      const percentage = total > 0 ? (count / total) : 0;
      const barY = doc.y;

      // Check for page break before drawing row
      if (barY > doc.page.height - 40) {
        doc.addPage();
        return drawProgressBar(label, count, total, color);
      }
      
      doc.fillColor('#374151').fontSize(9).font('Roboto-Regular').text(label, 40, barY, { width: 100 });
      
      // Gray background bar
      doc.rect(150, barY - 1, BAR_MAX_W, 10).fill('#f3f4f6');
      // Filled colored bar
      if (percentage > 0) {
        doc.rect(150, barY - 1, BAR_MAX_W * percentage, 10).fill(color);
      }
      
      doc.fillColor('#111827').fontSize(9).font('Roboto-Bold')
         .text(`${count} (${Math.round(percentage * 100)}%)`, 150 + BAR_MAX_W + 10, barY);
      
      doc.moveDown(0.6);
    };

    // ── 1) AGE ───────────────────────────────────────────────────────────────
    drawSectionHeader('THỐNG KÊ ĐỘ TUỔI');
    if (ageRows.length === 0) doc.fontSize(9).fillColor(COLOR_GRAY).text('Không có dữ liệu');
    else ageRows.forEach(r => drawProgressBar(r.label, r.count, paidCount, '#6366f1'));

    // ── 2) GENDER ────────────────────────────────────────────────────────────
    drawSectionHeader('THỐNG KÊ GIỚI TÍNH');
    if (genderRows.length === 0) {
      doc.fontSize(9).fillColor(COLOR_GRAY).text('Không có dữ liệu');
    } else {
      const gStats = { 'Nam': 0, 'Nữ': 0, 'Khác': 0 };
      genderRows.forEach(r => {
        const lbl = r.gender === 'male' ? 'Nam' : (r.gender === 'female' ? 'Nữ' : 'Khác');
        gStats[lbl] += r.count;
      });
      Object.entries(gStats).forEach(([lbl, cnt]) => drawProgressBar(lbl, cnt, paidCount, '#10b981')); // Emerald
    }

    // ── 3) JOB ───────────────────────────────────────────────────────────────
    drawSectionHeader('THỐNG KÊ VAI TRÒ (JOB)');
    if (jobRows.length === 0) doc.fontSize(9).fillColor(COLOR_GRAY).text('Không có dữ liệu');
    else jobRows.forEach(r => drawProgressBar(r.label, r.count, paidCount, '#f59e0b'));

    // ── 4) PLANS ─────────────────────────────────────────────────────────────
    drawSectionHeader('PHÂN BỔ GÓI CƯỚC');
    if (planRows.length === 0) {
      doc.fontSize(9).fillColor(COLOR_GRAY).text('Không có dữ liệu');
    } else {
      const planStartY = doc.y;
      doc.fillColor(COLOR_GRAY).fontSize(8).font('Roboto-Bold')
         .text('Gói cước', 40, planStartY)
         .text('Số lượng', 180, planStartY, { width: 60, align: 'right' })
         .text('Doanh thu', 250, planStartY, { width: 100, align: 'right' })
         .text('% Doanh thu', 360, planStartY, { width: 70, align: 'right' });
      
      doc.moveTo(40, doc.y + 2).lineTo(40 + PAGE_WIDTH, doc.y + 2).strokeColor(COLOR_BORDER).stroke();
      doc.moveDown(0.5);

      planRows.forEach(r => {
        const rowY = doc.y;
        if (rowY > doc.page.height - 40) doc.addPage();
        const revPct = totalRevenue > 0 ? (r.revenue / totalRevenue) : 0;
        
        doc.fillColor('#111827').fontSize(9).font('Roboto-Regular')
           .text(r.label, 40, rowY)
           .text(r.count, 180, rowY, { width: 60, align: 'right' })
           .text(parseFloat(r.revenue).toLocaleString('vi-VN') + ' đ', 250, rowY, { width: 100, align: 'right' })
           .text(Math.round(revPct * 100) + '%', 360, rowY, { width: 70, align: 'right' });
        
        doc.moveDown(0.4);
      });
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.moveTo(40, footerY).lineTo(40 + PAGE_WIDTH, footerY).strokeColor(COLOR_BORDER).stroke();
    doc.fillColor(COLOR_GRAY).fontSize(8).font('Roboto-Regular')
       .text('Báo cáo được trích xuất từ hệ thống quản trị Edutech', 40, footerY + 10, { align: 'center', width: PAGE_WIDTH });

    doc.end();

  } catch (error) {
    console.error('generatePaymentSummaryPDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary PDF' });
  }
}


/**
 * @desc    Get paginated transaction receipts with customer identification
 * @route   GET /api/v1/admin/payment/receipts?from=&to=&page=&limit=
 * @access  Private/Admin
 */
async function getTransactionReceipts(req, res) {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const offset   = (pageNum - 1) * limitNum;

    let dateFilter = `t.status = 'success'`;
    const params = [];
    if (from) { dateFilter += ` AND t.created_at >= ?`; params.push(from); }
    if (to)   { dateFilter += ` AND t.created_at <= ?`; params.push(`${to} 23:59:59`); }

    // Total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM transactions t WHERE ${dateFilter}`,
      params
    );

    // Receipts with customer info
    const [rows] = await db.query(
      `SELECT
         t.id                     AS transaction_id,
         t.gateway_transaction_id AS gateway_transaction_id,
         t.sepay_order_code       AS sepay_order_code,
         t.amount,
         t.payment_method,
         t.created_at             AS paid_at,
         i.invoice_code           AS receipt_number,
         sp.code                  AS plan_code,
         sp.name                  AS plan_name,
         sp.currency,
         u.id                     AS user_id,
         u.email,
         u.role,
         u.subject,
         up.name                  AS customer_name,
         up.gender,
         up.date_of_birth,
         up.address
       FROM transactions t
       JOIN users u              ON t.user_id = u.id
       LEFT JOIN user_profiles up ON t.user_id = up.user_id
       LEFT JOIN invoices i       ON t.id = i.transaction_id
       LEFT JOIN subscriptions s  ON t.subscription_id = s.id
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE ${dateFilter}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const receipts = rows.map(r => ({
      receiptNumber:       r.receipt_number   || `TXN-${r.transaction_id.slice(0, 8).toUpperCase()}`,
      transactionId:       r.transaction_id,
      gatewayTransactionId: r.gateway_transaction_id,
      sepayOrderCode:      r.sepay_order_code,
      amount:              parseFloat(r.amount),
      currency:            r.currency || 'VND',
      paymentMethod:       r.payment_method,
      paidAt:              r.paid_at,
      plan:                { code: r.plan_code, name: r.plan_name },
      customer: {
        userId:      r.user_id,
        email:       r.email,
        name:        r.customer_name || null,
        role:        r.role,
        subject:     r.subject       || null,
        gender:      r.gender        || null,
        dateOfBirth: r.date_of_birth || null,
        address:     r.address       || null
      }
    }));

    res.json({
      success: true,
      data: receipts,
      pagination: {
        total:      parseInt(countRows[0].total),
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(parseInt(countRows[0].total) / limitNum)
      }
    });
  } catch (error) {
    console.error('getTransactionReceipts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transaction receipts', error: error.message });
  }
}

/**
 * @desc    Generate PDF transaction receipt report
 * @route   GET /api/v1/admin/payment/receipts/pdf?from=&to=
 * @access  Private/Admin
 */
async function generateReceiptPDF(req, res) {
  try {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const { from, to } = req.query;

    // Font paths – Roboto supports full Vietnamese Unicode
    const FONT_REGULAR = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
    const FONT_BOLD    = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

    let dateFilter = `t.status = 'success'`;
    const params = [];
    if (from) { dateFilter += ` AND t.created_at >= ?`; params.push(from); }
    if (to)   { dateFilter += ` AND t.created_at <= ?`; params.push(`${to} 23:59:59`); }

    // Summary row
    const [summaryRows] = await db.query(
      `SELECT COUNT(DISTINCT t.user_id) AS paid_count, COALESCE(SUM(t.amount), 0) AS total_revenue
       FROM transactions t WHERE ${dateFilter}`,
      params
    );

    // All receipts (no pagination for PDF)
    const [rows] = await db.query(
      `SELECT
         t.id                     AS transaction_id,
         t.gateway_transaction_id AS gateway_transaction_id,
         t.sepay_order_code       AS sepay_order_code,
         t.description            AS tx_description,
         t.amount,
         t.created_at             AS paid_at,
         i.invoice_code           AS receipt_number,
         sp.name                  AS plan_name,
         u.email,
         up.name                  AS customer_name
       FROM transactions t
       JOIN users u               ON t.user_id = u.id
       LEFT JOIN user_profiles up  ON t.user_id = up.user_id
       LEFT JOIN invoices i        ON t.id = i.transaction_id
       LEFT JOIN subscriptions s   ON t.subscription_id = s.id
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE ${dateFilter}
       ORDER BY t.created_at DESC`,
      params
    );

    const paidCount   = parseInt(summaryRows[0].paid_count);
    const totalRevenue = parseFloat(summaryRows[0].total_revenue);

    // ── Build PDF ────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Register Vietnamese-compatible fonts
    doc.registerFont('Roboto-Regular', FONT_REGULAR);
    doc.registerFont('Roboto-Bold',    FONT_BOLD);

    const fileName = `transaction-receipts-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    const COLOR_PRIMARY = '#1a56db';
    const COLOR_GRAY    = '#6b7280';
    const COLOR_LIGHT   = '#f3f4f6';
    const COLOR_BORDER  = '#d1d5db';
    const PAGE_WIDTH    = doc.page.width - 80; // margins 40 each side

    // ── Header ───────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(COLOR_PRIMARY);
    doc.fillColor('#ffffff').fontSize(22).font('Roboto-Bold')
       .text('EDUTECH', 40, 25);
    doc.fontSize(11).font('Roboto-Regular')
       .text('Transaction Receipt Report', 40, 52);
    doc.fontSize(9)
       .text(`Generated: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`, 40, 68);

    // Period info (right aligned)
    const periodText = (from || to)
      ? `Period: ${from || 'All time'} → ${to || 'Now'}`
      : 'Period: All time';
    doc.fontSize(9).text(periodText, 40, 68, { align: 'right', width: PAGE_WIDTH });

    doc.moveDown(4);

    // ── Summary box ──────────────────────────────────────────────────────────
    const summaryY = doc.y;
    doc.rect(40, summaryY, PAGE_WIDTH, 68).fill(COLOR_LIGHT).stroke(COLOR_BORDER);
    doc.fillColor(COLOR_PRIMARY).fontSize(11).font('Roboto-Bold')
       .text('PAYMENT SUMMARY', 55, summaryY + 10);
    doc.fillColor('#111827').fontSize(10).font('Roboto-Regular')
       .text(`Paid Customers:`, 55,   summaryY + 30)
       .text(`${paidCount} customers`, 175, summaryY + 30);
    doc.text(`Total Revenue:`, 55, summaryY + 44)
       .text(`${totalRevenue.toLocaleString('vi-VN')} VND`, 175, summaryY + 44);

    doc.moveDown(3.5);

    // ── Reconciliation guide ─────────────────────────────────────────────────
    const guideY = doc.y;
    doc.rect(40, guideY, PAGE_WIDTH, 42).fill('#fffbeb').stroke('#f59e0b');
    doc.fillColor('#92400e').fontSize(8).font('Roboto-Bold')
       .text('📋 HƯỚNG DẪN ĐỐI SOÁT VỚI SỔ NGÂN HÀNG', 52, guideY + 6);
    doc.fillColor('#78350f').fontSize(7.5).font('Roboto-Regular')
       .text('Mỗi giao dịch dưới đây có cột "Nội dung CK" — đây là chuỗi khách hàng đã nhập khi chuyển khoản (ví dụ: EDUTECH 915490702099).', 52, guideY + 19, { width: PAGE_WIDTH - 24 })
       .text('Tìm đúng chuỗi này trong cột "Nội dung" trên sao kê ngân hàng để xác nhận giao dịch tương ứng.', 52, guideY + 30, { width: PAGE_WIDTH - 24 });
    doc.moveDown(3.5);

    // ── Transaction table ────────────────────────────────────────────────────
    doc.fillColor(COLOR_PRIMARY).fontSize(11).font('Roboto-Bold')
       .text('TRANSACTION DETAILS', 40, doc.y);
    doc.moveDown(0.4);

    // 7 aligned columns (Page width 595 - 40 margin = 555pt usable)
    const COL = {
      no:     { x: 40,  w: 20  },   // #
      email:  { x: 62,  w: 105 },   // Email
      name:   { x: 169, w: 85  },   // Tên KH
      plan:   { x: 256, w: 60  },   // Gói
      amt:    { x: 318, w: 70  },   // Số tiền
      date:   { x: 390, w: 55  },   // Ngày TT
      ck:     { x: 447, w: 108 }    // Nội dung CK (Increased to fit "EDUTECH {orderCode}")
    };

    const ROW1_H = 16;  // main data row
    const ROW2_H = 12;  // detail sub-row
    const BLOCK_H = ROW1_H + ROW2_H;

    // ── Table header ─────────────────────────────────────────────────────────
    const headerY = doc.y;
    doc.rect(40, headerY, PAGE_WIDTH, ROW1_H).fill('#1a56db');
    doc.fillColor('#ffffff').fontSize(7).font('Roboto-Bold');
    const hY = headerY + 5;
    doc.text('#',            COL.no.x   + 2, hY, { width: COL.no.w  });
    doc.text('Email',        COL.email.x + 2, hY, { width: COL.email.w });
    doc.text('Tên KH',       COL.name.x  + 2, hY, { width: COL.name.w  });
    doc.text('Gói',          COL.plan.x  + 2, hY, { width: COL.plan.w  });
    doc.text('Số tiền (VND)', COL.amt.x  + 2, hY, { width: COL.amt.w   });
    doc.text('Ngày TT',      COL.date.x  + 2, hY, { width: COL.date.w  });
    doc.text('Nội dung CK',  COL.ck.x   + 2, hY, { width: COL.ck.w   });

    let rowY = headerY + ROW1_H;

    rows.forEach((r, idx) => {
      // Page break
      if (rowY > doc.page.height - 80) {
        doc.addPage();
        rowY = 40;
      }

      const isEven = idx % 2 === 0;
      const bgMain = isEven ? '#ffffff' : '#f8faff';
      const bgSub  = isEven ? '#f1f5f9' : '#e8eef7';

      const receiptNum      = r.receipt_number || `TXN-${r.transaction_id.slice(0, 8).toUpperCase()}`;
      const payDate         = r.paid_at ? new Date(r.paid_at).toLocaleDateString('vi-VN') : '-';
      const transferContent = r.sepay_order_code ? `EDUTECH ${r.sepay_order_code}` : '-';
      const amtStr          = parseFloat(r.amount).toLocaleString('vi-VN');
      const sepayId         = r.gateway_transaction_id || r.sepay_order_code || '-';

      // ── Row 1: main data ──────────────────────────────────────────────────
      doc.rect(40, rowY, PAGE_WIDTH, ROW1_H).fill(bgMain).stroke(COLOR_BORDER);

      const r1y = rowY + 5;
      // #
      doc.fillColor('#6b7280').font('Roboto-Bold').fontSize(7);
      doc.text(`${idx + 1}`, COL.no.x + 2, r1y, { width: COL.no.w });
      // Email
      doc.fillColor('#111827').font('Roboto-Regular').fontSize(7);
      doc.text(r.email || '-', COL.email.x + 2, r1y, { width: COL.email.w, ellipsis: true });
      // Tên KH
      doc.text(r.customer_name || '-', COL.name.x + 2, r1y, { width: COL.name.w, ellipsis: true });
      // Gói – bold blue
      doc.fillColor('#1e40af').font('Roboto-Bold').fontSize(7);
      doc.text(r.plan_name || '-', COL.plan.x + 2, r1y, { width: COL.plan.w, ellipsis: true });
      // Số tiền – bold green
      doc.fillColor('#059669').font('Roboto-Bold').fontSize(7);
      doc.text(amtStr, COL.amt.x + 2, r1y, { width: COL.amt.w, ellipsis: true });
      // Ngày
      doc.fillColor('#374151').font('Roboto-Regular').fontSize(7);
      doc.text(payDate, COL.date.x + 2, r1y, { width: COL.date.w });
      // Nội dung CK (short preview) – orange bold
      doc.fillColor('#b45309').font('Roboto-Bold').fontSize(6.5);
      doc.text(transferContent, COL.ck.x + 2, r1y, { width: COL.ck.w, ellipsis: true, lineBreak: false });

      // ── Row 2: detail line (receipt # │ SePay ID │ full transfer content) ─
      doc.rect(40, rowY + ROW1_H, PAGE_WIDTH, ROW2_H).fill(bgSub).stroke(COLOR_BORDER);

      const r2y = rowY + ROW1_H + 3;
      doc.fillColor('#9ca3af').font('Roboto-Regular').fontSize(6.5);
      const detailLine = `Mã HĐ: ${receiptNum}   |   SePay ID: ${sepayId}   |   Nội dung CK: ${transferContent}`;
      doc.text(detailLine, 52, r2y, { width: PAGE_WIDTH - 14, ellipsis: true });

      rowY += BLOCK_H;
    });

    if (rows.length === 0) {
      doc.fillColor(COLOR_GRAY).fontSize(10).font('Roboto-Regular')
         .text('Không có giao dịch thành công trong kỳ đã chọn.', 40, rowY + 10, { align: 'center', width: PAGE_WIDTH });
    }


    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 30;
    doc.fillColor(COLOR_GRAY).fontSize(8).font('Roboto-Regular')
       .text(`EduTech Platform  |  Tổng: ${rows.length} giao dịch  |  Trang 1`,
             40, footerY, { align: 'center', width: PAGE_WIDTH });

    doc.end();
  } catch (error) {
    console.error('generateReceiptPDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
    }
  }
}
