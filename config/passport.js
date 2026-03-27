const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy - chỉ khởi tạo nếu có đủ config
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
        scope: ['profile', 'email']
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Kiểm tra xem user đã tồn tại chưa
        const email = profile.emails[0].value;
        let user = await User.findByEmail(email);

        if (user) {
          // User đã tồn tại, kiểm tra xem đã link Google chưa
          if (user.google_id && user.google_id !== profile.id) {
            return done(null, false, { message: 'Email đã được sử dụng với tài khoản khác' });
          }
          
          // Cập nhật google_id nếu chưa có
          if (!user.google_id) {
            await User.updateGoogleId(user.id, profile.id);
            user.google_id = profile.id;
          }

          // Đảm bảo existing user cũng có profile
          const UserProfile = require('../models/UserProfile');
          const existingProfile = await UserProfile.findByUserId(user.id);
          if (!existingProfile) {
            await UserProfile.create(user.id, {
              name: profile.displayName || email.split('@')[0],
              avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null
            });
          }
        } else {
          // Tạo user mới từ Google account
          const userId = await User.create({
            email: email,
            password: null, // OAuth users không cần password
            role: 'TEACHER', // Mặc định là TEACHER
            google_id: profile.id,
            is_verified: true // Google account đã được verify
          });
          
          user = await User.findById(userId);

          // Tạo profile cho user mới
          const UserProfile = require('../models/UserProfile');
          await UserProfile.create(userId, {
            name: profile.displayName || email.split('@')[0],
            avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);
} else {
  console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file.');
}

module.exports = passport;
