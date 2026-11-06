const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendOTPEmail = async (email, name, otp) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV EMAIL SIMULATION] OTP for ${email}: ${otp}`);
    return;
  }
  
  const mailOptions = {
    from: process.env.SMTP_FROM || `"RecoverForge" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your RecoverForge Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #0a0a0f; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 40px auto; background: #12121a; border-radius: 12px; border: 1px solid #2a2a35; overflow: hidden; }
          .header { background: #12121a; padding: 32px; text-align: center; border-bottom: 1px solid #2a2a35; }
          .logo { color: #e7ff47; font-size: 24px; font-weight: 800; }
          .content { padding: 32px; text-align: center; }
          .otp-box { display: inline-block; background: #1a1a24; border: 2px solid #e7ff47; border-radius: 12px; padding: 16px 32px; margin: 24px 0; }
          .otp { font-size: 40px; font-weight: 800; color: #e7ff47; letter-spacing: 8px; }
          h2 { color: #fff; font-size: 22px; margin-bottom: 8px; }
          p { color: #9ca3af; line-height: 1.6; margin: 8px 0; }
          .footer { padding: 16px 32px; text-align: center; border-top: 1px solid #2a2a35; }
          .footer p { color: #4b5563; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">⚡ RecoverForge</div>
          </div>
          <div class="content">
            <h2>Verify your merchant account</h2>
            <p>Hi ${name}, use the code below to complete your signup.</p>
            <div class="otp-box">
              <div class="otp">${otp}</div>
            </div>
            <p>This code expires in <strong style="color:#e7ff47">10 minutes</strong>.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 RecoverForge. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
