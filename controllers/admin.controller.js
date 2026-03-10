const db = require('../config/database');

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
              SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as students
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
          students: parseInt(currentResult[0].students || 0)
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
    `SELECT COUNT(*) as total, SUM(CASE WHEN role = 'TEACHER' THEN 1 ELSE 0 END) as teachers, SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as students FROM users WHERE is_deleted = FALSE`
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
      students: parseInt(currentResult[0].students || 0)
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
  createEnterpriseCustomer
};
