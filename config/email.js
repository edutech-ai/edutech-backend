const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Verify SendGrid connection
if (process.env.SENDGRID_API_KEY) {
  console.log('✅ SendGrid Email service ready');
} else {
  console.error('❌ SENDGRID_API_KEY not found');
}

// Gửi OTP email
async function sendOTPEmail(email, otp, purpose = 'reset_password', userName = 'User') {
  const purposes = {
    register: {
      subject: 'Xác thực đăng ký tài khoản - EduTech',
      title: '✉️ Xác thực Email',
      message: 'Cảm ơn bạn đã đăng ký tài khoản EduTech!',
      instruction: 'Vui lòng nhập mã này để hoàn tất đăng ký.'
    },
    reset_password: {
      subject: 'Mã OTP đặt lại mật khẩu - EduTech',
      title: '🔐 Đặt lại mật khẩu',
      message: 'Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản EduTech của mình.',
      instruction: 'Vui lòng nhập mã này để tiếp tục đặt lại mật khẩu.'
    }
  };

  const config = purposes[purpose] || purposes.reset_password;

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'EduTech'} <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: config.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; margin: 20px 0; text-align: center; border: 2px dashed #667eea; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .warning { color: #e74c3c; margin-top: 20px; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.title}</h1>
          </div>
          <div class="content">
            <p>Xin chào bạn,</p>
            <p>${config.message}</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666;">Mã OTP của bạn là:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Mã có hiệu lực trong <strong>5 phút</strong></p>
            </div>
            
            <p>${config.instruction}</p>
            
            <div class="warning">
              ⚠️ <strong>Lưu ý:</strong>
              <ul style="text-align: left; margin: 10px 0;">
                <li>Không chia sẻ mã OTP này với bất kỳ ai</li>
                <li>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này</li>
                <li>Mã OTP chỉ sử dụng được 1 lần</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 EduTech. All rights reserved.</p>
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sgMail.send(mailOptions);
    console.log('✅ Email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error.response?.body || error);
    throw error;
  }
}

// Gửi email thông báo đổi mật khẩu thành công
async function sendPasswordChangedEmail(email, userName = 'User') {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'EduTech'} <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Mật khẩu đã được thay đổi - EduTech',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Thành công!</h1>
          </div>
          <div class="content">
            <div class="success-icon">🎉</div>
            <p>Xin chào bạn,</p>
            <p>Mật khẩu của bạn đã được thay đổi thành công vào lúc <strong>${new Date().toLocaleString('vi-VN')}</strong>.</p>
            <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
          </div>
          <div class="footer">
            <p>© 2026 EduTech. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sgMail.send(mailOptions);
    console.log('✅ Password changed notification sent');
  } catch (error) {
    console.error('❌ Email send error:', error.response?.body || error);
  }
}

module.exports = {
  sendOTPEmail,
  sendPasswordChangedEmail
};
