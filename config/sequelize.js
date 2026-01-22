const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'edutech',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '+07:00',
    dialectOptions: {
      ssl: {
        rejectUnauthorized: true
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
);

// Test connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Sequelize Connected to MySQL');
  })
  .catch(err => {
    console.error('❌ Sequelize Connection Error:', err.message);
  });

module.exports = sequelize;
