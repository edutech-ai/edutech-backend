/**
 * Timezone utility functions for handling Vietnam timezone (UTC+7)
 */

/**
 * Convert UTC date to Vietnam timezone
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date in Vietnam timezone
 */
const toVietnamTime = (date) => {
  const d = new Date(date);
  // Add 7 hours for Vietnam timezone (UTC+7)
  d.setHours(d.getHours() + 7);
  return d;
};

/**
 * Get current date/time in Vietnam timezone
 * @returns {Date} Current date in Vietnam timezone
 */
const nowVietnam = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
};

/**
 * Format date for SQL queries with Vietnam timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD HH:mm:ss)
 */
const formatForSQL = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Get SQL query snippet to convert UTC to Vietnam time
 * @param {string} columnName - Name of the datetime column
 * @returns {string} SQL convert snippet
 */
const convertToVietnamSQL = (columnName) => {
  return `CONVERT_TZ(${columnName}, '+00:00', '+07:00')`;
};

/**
 * Get start of day in Vietnam timezone
 * @param {Date|string} date - Date to get start of day
 * @returns {Date} Start of day in Vietnam timezone
 */
const startOfDayVietnam = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day in Vietnam timezone
 * @param {Date|string} date - Date to get end of day
 * @returns {Date} End of day in Vietnam timezone
 */
const endOfDayVietnam = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Check if database timezone is correct
 * @param {Object} db - Database connection
 * @returns {Promise<boolean>} True if timezone is +07:00
 */
const checkDatabaseTimezone = async (db) => {
  try {
    const [rows] = await db.query("SELECT @@session.time_zone as tz");
    const timezone = rows[0].tz;
    console.log(`📍 Database timezone: ${timezone}`);
    return timezone === '+07:00' || timezone === 'Asia/Ho_Chi_Minh';
  } catch (error) {
    console.error('Error checking timezone:', error);
    return false;
  }
};

/**
 * Force set database timezone to Vietnam time
 * @param {Object} db - Database connection
 * @returns {Promise<void>}
 */
const setDatabaseTimezone = async (db) => {
  try {
    await db.query("SET time_zone = '+07:00'");
    console.log('✅ Database timezone set to +07:00 (Vietnam)');
  } catch (error) {
    console.error('❌ Failed to set timezone:', error);
    throw error;
  }
};

module.exports = {
  toVietnamTime,
  nowVietnam,
  formatForSQL,
  convertToVietnamSQL,
  startOfDayVietnam,
  endOfDayVietnam,
  checkDatabaseTimezone,
  setDatabaseTimezone
};
