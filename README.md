# 🚀 Backend Setup Guide

## 📋 Prerequisites

- Node.js 18+ 
- MySQL/TiDB Cloud database
- Gmail account (for OTP emails)
- Cloudinary account (for image uploads)
- Redis (Upstash for production or Docker for local)

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:
- **Database**: TiDB Cloud or MySQL connection details
- **Email**: Gmail + App Password
- **Redis**: Upstash URL or local Redis
- **Cloudinary**: Cloud name, API key, API secret

### 3. Run server
```bash
npm run dev
```

Server will start at: http://localhost:3000
Swagger docs: http://localhost:3000/docs

## 🔑 Required Services Setup

### Database (TiDB Cloud)
1. Sign up at https://tidbcloud.com
2. Create a cluster
3. Copy connection details to `.env`

### Email (Gmail App Password)
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy to `.env`

### Redis (Upstash - Recommended for Production)
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy connection string to `REDIS_URL` in `.env`

### Cloudinary (Image Upload)
1. Sign up at https://cloudinary.com
2. Get credentials from Dashboard
3. Copy to `.env`

## 📚 API Documentation

Visit http://localhost:3000/docs for interactive Swagger documentation.

### Main Endpoints:
- **Auth**: `/api/v1/auth/*` - Register, login, forgot password, OTP verification
- **Profile**: `/api/v1/profile/*` - User profile management with avatar upload

## 🧪 Testing

### Register with OTP verification:
1. POST `/auth/register` - Send OTP to email
2. Check email for OTP code
3. POST `/auth/verify-register` - Complete registration

### Upload Avatar:
1. Login to get JWT token
2. PUT `/profile` with `multipart/form-data`
3. Include `avatar` file + other profile fields

## 📂 Project Structure

```
backend/
├── config/          # Database, Redis, Cloudinary, Email configs
├── controllers/     # Business logic
├── middlewares/     # Auth, validation, file upload
├── models/          # Database models
├── routes/          # API routes with Swagger docs
├── uploads/         # Temporary file storage (gitignored)
├── .env.example     # Environment variables template
└── server.js        # Entry point
```

## 🔒 Security Notes

- Never commit `.env` file
- Keep API keys secure
- Use App Passwords for Gmail (never use main password)
- Enable 2FA on all services

## 🛠️ Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## 📞 Support

For issues or questions, check the Swagger docs or review the code comments.
