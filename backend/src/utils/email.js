const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // For development only
  }
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
    console.log(`📧 From: ${process.env.EMAIL_USER}`);
  }
});

const sendEmail = async (options) => {
  try {
    console.log(`📤 Attempting to send email to: ${options.email}`);
    
    const mailOptions = {
      from: `"DriveClone" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('👤 To:', options.email);
    
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
};

const sendActivationEmail = async (user, token) => {
  const activationUrl = `${process.env.FRONTEND_URL}/activate/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Welcome to DriveClone!</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2>Hi ${user.firstName},</h2>
        <p>Thank you for registering with DriveClone. Please activate your account by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationUrl}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; 
                    border-radius: 6px; font-weight: bold; display: inline-block;">
            Activate Account
          </a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <div style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <code style="word-break: break-all;">${activationUrl}</code>
        </div>
        
        <p><strong>This link will expire in 24 hours.</strong></p>
        <p>If you didn't create an account with DriveClone, please ignore this email.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>Best regards,<br>The DriveClone Team</p>
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `Welcome to DriveClone!\n\nHi ${user.firstName},\n\nThank you for registering with DriveClone. Please activate your account by visiting:\n${activationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account with DriveClone, please ignore this email.\n\nBest regards,\nThe DriveClone Team`;

  return await sendEmail({
    email: user.email,
    subject: 'Activate Your DriveClone Account',
    text: text,
    html: html
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Password Reset Request</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2>Hi ${user.firstName},</h2>
        <p>You recently requested to reset your password for your DriveClone account. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; 
                    border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <div style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <code style="word-break: break-all;">${resetUrl}</code>
        </div>
        
        <p><strong>This password reset link will expire in 10 minutes.</strong></p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>Best regards,<br>The DriveClone Team</p>
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `Password Reset Request\n\nHi ${user.firstName},\n\nYou recently requested to reset your password for your DriveClone account.\nPlease use the following link to reset your password:\n\n${resetUrl}\n\nThis password reset link will expire in 10 minutes.\n\nIf you didn't request a password reset, please ignore this email.\n\nBest regards,\nThe DriveClone Team`;

  return await sendEmail({
    email: user.email,
    subject: 'Password Reset Request - DriveClone',
    text: text,
    html: html
  });
};

module.exports = {
  sendEmail,
  sendActivationEmail,
  sendPasswordResetEmail
};