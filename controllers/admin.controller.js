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

module.exports = {
  getRevenueMetrics,
  getActiveCustomers,
  getTotalUsers,
  getAvgRevenuePerCustomer,
  getTrialUsers,
  getExamsCreated,
  getDashboardSummary,
  getRevenueChart,
  getUserGrowthChart
};
