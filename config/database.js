const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exe201_db',
    port: process.env.DB_PORT || 3306,
    timezone: '+07:00', // Giờ VN
    // Connection pool settings
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    // Keep alive
    keepAliveInitialDelay: 0,
    enableKeepAlive: true
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log(`✅ MySQL Connected: ${process.env.DB_HOST}`);
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL Connection Error:', err.message);
    });

module.exports = pool;
