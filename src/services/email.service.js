import nodemailer from "nodemailer";

// Tạo transporter cho Gmail hoặc SMTP service khác
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Hoặc có thể config SMTP khác
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_APP_PASSWORD  
    }
  });
};

// Gửi OTP qua email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Navi Network" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Email Verification - Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Email Verification</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555; margin-bottom: 10px;">
              Your verification code is:
            </p>
            <h1 style="font-size: 32px; color: #007bff; text-align: center; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            ⏰ This code will expire in <strong>10 minutes</strong>
          </p>
          <p style="color: #666; font-size: 14px;">
            🔒 Don't share this code with anyone for security reasons
          </p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

// Gửi email chào mừng sau khi verify thành công
export const sendWelcomeEmail = async (email) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"NaVi App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to NaVi! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Welcome to NaVi! 🎉</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #555;">
              Congratulations! Your email has been verified successfully.
            </p>
            <p style="font-size: 16px; color: #555;">
              You can now enjoy all features of NaVi app.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Get Started
            </a>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Thank you for choosing NaVi!
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Không throw error ở đây vì welcome email không quan trọng lắm
    return { success: false, error: error.message };
  }
};
