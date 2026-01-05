# User & Profile Module - EXE201

## 📋 Overview

Complete implementation of User Authentication and Profile Management module with UUID-based user IDs.

## ✨ Features Implemented

### Authentication
- ✅ **Register** - Create new user accounts (Teacher, Student, Admin)
- ✅ **Login** - Authenticate users with JWT tokens
- ✅ **Logout** - Sign out users (client-side token removal)
- ✅ **Change Password** - Update password for authenticated users
- ✅ **Forgot Password** - Request password reset (token generation)
- ✅ **Reset Password** - Reset password with token (needs implementation)

### Profile Management
- ✅ **Create Profile** - Add personal information
- ✅ **Read Profile** - Get own profile or public profiles
- ✅ **Update Profile** - Modify profile information
- ✅ **Delete Profile** - Remove profile data

## 📁 File Structure

```
backend/
├── models/
│   ├── User.js              ✅ User model with UUID support
│   └── UserProfile.js       ✅ Profile model
├── controllers/
│   ├── auth.controller.js   ✅ Auth endpoints (register, login, logout, etc.)
│   └── profile.controller.js ✅ Profile CRUD endpoints
├── routes/
│   ├── auth.route.js        ✅ Auth routes with validations
│   └── profile.route.js     ✅ Profile routes with validations
├── middlewares/
│   └── auth.js              ✅ JWT authentication middleware
├── database/
│   └── schema.sql           ✅ Database schema
├── config/
│   ├── database.js          ✅ MySQL connection
│   └── swagger.js           ✅ API documentation
├── API_DOCUMENTATION.md     ✅ Complete API docs
├── TEST_GUIDE.md            ✅ Testing instructions
├── postman_collection.json  ✅ Postman collection
├── .env                     ✅ Environment variables
└── server.js                ✅ Express server
```

## 🗄️ Database Schema

### users
```sql
id          VARCHAR(36)     PRIMARY KEY (UUID)
email       VARCHAR(255)    UNIQUE, NOT NULL
password_hash VARCHAR(255)  NOT NULL
role        ENUM            STUDENT, TEACHER, ADMIN
subject     ENUM            TOAN, VAN, ANH, etc.
status      VARCHAR(50)     active, banned
created_at  TIMESTAMP
is_deleted  BOOLEAN
```

### user_profiles
```sql
user_id             VARCHAR(36)   PRIMARY KEY, FK -> users(id)
date_of_birth       DATE
gender              VARCHAR(20)
avatar_url          VARCHAR(500)
address             TEXT
email_notification  BOOLEAN
push_notification   BOOLEAN
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Database
```bash
# Run the schema.sql in your MySQL database
mysql -u root -p < database/schema.sql
```

### 3. Configure Environment
```bash
# .env file already configured
# Check DB credentials if needed
```

### 4. Start Server
```bash
npm run dev
```

### 5. Test APIs
Navigate to: `http://localhost:3000/docs`

## 📡 API Endpoints

### Auth Endpoints (`/api/v1/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login user |
| POST | `/logout` | ✅ | Logout user |
| GET | `/profile` | ✅ | Get current user info |
| POST | `/change-password` | ✅ | Change password |
| POST | `/forgot-password` | ❌ | Request password reset |
| POST | `/reset-password` | ❌ | Reset password with token |

### Profile Endpoints (`/api/v1/profile`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get my full profile |
| POST | `/` | ✅ | Create profile |
| PUT | `/` | ✅ | Update profile |
| DELETE | `/` | ✅ | Delete profile |
| GET | `/:userId` | ❌ | Get public profile |

## 🔐 Authentication

### JWT Token
After login/register, you receive a JWT token:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Use this token in headers for protected routes:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Token Expiry
- Default: 7 days
- Configurable via `JWT_EXPIRE` in `.env`

## 🧪 Testing

### Using Swagger UI
1. Go to: `http://localhost:3000/docs`
2. Test endpoints interactively
3. Authorize with JWT token

### Using Postman
1. Import: `postman_collection.json`
2. Run collection in order
3. Token auto-saved after login

### Using cURL
See `TEST_GUIDE.md` for curl commands

## ✅ Validation Rules

### Registration
- Email: Valid email format
- Password: Minimum 6 characters
- Role: STUDENT, TEACHER, or ADMIN
- Subject: Required for TEACHER role

### Profile
- date_of_birth: ISO 8601 date format
- avatar_url: Valid URL format
- Notifications: Boolean values

## 🔒 Security Features

- ✅ Password hashing with bcryptjs (10 rounds)
- ✅ JWT token authentication
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation with express-validator
- ✅ Soft delete for users
- ✅ Role-based access control ready

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## 🛠️ Technologies Used

- **Node.js** - Runtime
- **Express.js** - Web framework
- **MySQL** - Database (TiDB Cloud)
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **uuid** - UUID generation
- **Swagger** - API documentation

## 🐛 Known Issues & TODOs

### Password Reset
❌ Reset password endpoint needs implementation:
1. Create `password_reset_tokens` table
2. Implement token verification
3. Add email service integration

### Recommended Improvements
- [ ] Token blacklist for logout
- [ ] Email service (nodemailer)
- [ ] Rate limiting
- [ ] File upload for avatars
- [ ] Refresh token mechanism
- [ ] Two-factor authentication
- [ ] Account verification email

## 📚 Documentation

- **API Docs**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Test Guide**: [TEST_GUIDE.md](./TEST_GUIDE.md)
- **Swagger UI**: `http://localhost:3000/docs`
- **Postman**: [postman_collection.json](./postman_collection.json)

## 🎯 Testing Checklist

Run through this checklist to verify everything works:

- [ ] Server starts without errors
- [ ] Health check returns 200
- [ ] Can register Teacher with subject
- [ ] Can register Student without subject
- [ ] Cannot register with duplicate email
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong password
- [ ] Token works for protected routes
- [ ] Can create profile
- [ ] Can update profile fields
- [ ] Can get full profile (authenticated)
- [ ] Can get public profile (no auth)
- [ ] Can change password
- [ ] Forgot password generates token
- [ ] Can logout successfully

## 🆘 Support

If you encounter issues:

1. Check database connection in `.env`
2. Verify tables exist: `SHOW TABLES;`
3. Check server logs for errors
4. Review API documentation
5. Test with Swagger UI first

## 📄 License

Part of EXE201 project.

---

**Status**: ✅ Ready for Development & Testing

**Last Updated**: 2026-01-05
