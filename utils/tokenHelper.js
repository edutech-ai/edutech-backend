const jwt = require('jsonwebtoken');

// Helper functions để generate tokens
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' } // 15 phút
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' } // 7 ngày
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
