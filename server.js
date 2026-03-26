const express = require("express");
const http = require("http");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config({ debug: false });

const passport = require("./config/passport");
const setupSwagger = require("./config/swagger");

// Import database connection
const db = require("./config/database");

// Import Redis connection (for OTP storage)
const redisClient = require("./config/redis");


const app = express();
const server = http.createServer(app);

// CORS Configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://go-edutech.vercel.app",
      "https://aiedutech.vn",
      "https://www.aiedutech.vn"
    ],
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "EXE201_SECRET_KEY",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Setup Swagger
setupSwagger(app);

// Root route
app.get("/", (req, res) => {
  res.redirect("/docs");
});

// Health check route
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    // Check timezone
    const [tzResult] = await db.query("SELECT @@session.time_zone as tz, NOW() as db_time");
    const timezone = tzResult[0].tz;
    const dbTime = tzResult[0].db_time;

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      serverTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      databaseTimezone: timezone,
      databaseTime: dbTime
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    });
  }
});

// API Routes will be mounted here
app.use("/api/v1/auth", require("./routes/auth.route"));
app.use("/api/v1/profile", require("./routes/profile.route"));
app.use("/api/v1/settings", require("./routes/settings.route"));
app.use("/api/v1/quizzes", require("./routes/quiz.route"));
app.use("/api/v1/exam-matrices", require("./routes/examMatrix.route"));
app.use("/api/v1/notifications", require("./routes/notification.route"));
app.use("/api/v1/questions", require("./routes/question.route"));
app.use("/api/v1/classrooms", require("./routes/classroom.route"));
app.use("/api/v1/students", require("./routes/student.route"));
app.use("/api/v1/folders", require("./routes/folder.route"));
app.use("/api/v1/documents", require("./routes/document.route"));
app.use("/api/v1/library", require("./routes/library.route"));
app.use("/api/v1/payment", require("./routes/payment.route"));
app.use("/api/v1", require("./routes/performance.route"));
app.use("/api/v1/ai", require("./routes/ai.route"));
app.use("/api/v1/admin", require("./routes/admin.route"));
app.use("/api/v1/reports", require("./routes/report.route"));
app.use("/api/v1/omr", require("./routes/omr.route"));
// app.use("/api/v1/users", require("./routes/user.route"));
// Add more routes as needed

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? {
          stack: err.stack,
          ...err,
        }
        : {},
  });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📘 Swagger docs: http://localhost:${PORT}/docs`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`💾 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});
