const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendActivationEmail, sendPasswordResetEmail } = require('../utils/email');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, firstName, lastName, password } = req.body;

    console.log(`📝 Registration attempt for: ${email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (existingUser) {
      console.log(`❌ User already exists: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password: password
    });

    console.log(`✅ User created: ${user.email} (ID: ${user._id})`);

    // Generate activation token
    const activationToken = user.getActivationToken();
    await user.save();

    console.log(`🔄 Generated activation token for: ${user.email}`);

    // Send activation email
    try {
      console.log(`📤 Attempting to send activation email to: ${user.email}`);
      const emailSent = await sendActivationEmail(user, activationToken);

      if (emailSent) {
        console.log(`✅ Activation email sent successfully to: ${user.email}`);
        res.status(201).json({
          success: true,
          message: 'Registration successful! Please check your email to activate your account.'
        });
      } else {
        console.error(`❌ Failed to send activation email to: ${user.email}`);
        res.status(201).json({
          success: true,
          message: 'Registration successful! However, we could not send the activation email. Please contact support.'
        });
      }
    } catch (emailError) {
      console.error('❌ Activation email error:', emailError);
      // Don't fail registration if email fails
      res.status(201).json({
        success: true,
        message: 'Registration successful! However, we encountered an issue sending the activation email.'
      });
    }

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    next(error);
  }
};

// @desc    Activate account
// @route   GET /api/auth/activate/:token
// @access  Public
exports.activateAccount = async (req, res, next) => {
  try {
    const { token } = req.params;

    console.log(`🔍 Activation attempt with token: ${token}`);

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by activation token
    const user = await User.findOne({
      activationToken: hashedToken,
      activationTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      console.log(`❌ Invalid or expired activation token: ${token}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired activation token'
      });
    }

    console.log(`✅ User found for activation: ${user.email}`);

    // Activate account
    user.isActive = true;
    user.activationToken = undefined;
    user.activationTokenExpire = undefined;
    await user.save();

    console.log(`✅ Account activated for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Account activated successfully. You can now login.'
    });

  } catch (error) {
    console.error('❌ Activation error:', error);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`❌ Account not active: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Please activate your account first'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    console.log(`✅ Login successful for: ${email}`);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    console.log(`🔍 Forgot password request for: ${email}`);

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address'
      });
    }

    console.log(`✅ User found: ${user.email} (${user.firstName} ${user.lastName})`);

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    console.log(`🔄 Generated reset token for: ${user.email}`);

    try {
      // Send password reset email
      console.log(`📤 Attempting to send reset email to: ${user.email}`);
      const emailSent = await sendPasswordResetEmail(user, resetToken);

      if (emailSent) {
        console.log(`✅ Reset email sent successfully to: ${user.email}`);
        res.status(200).json({
          success: true,
          message: 'Password reset email sent successfully. Please check your inbox.'
        });
      } else {
        console.error(`❌ Failed to send email to: ${user.email}`);
        
        // Clean up token if email fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        
        res.status(500).json({
          success: false,
          error: 'Failed to send reset email. Please try again later.'
        });
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      
      // Clean up token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      
      res.status(500).json({
        success: false,
        error: 'Failed to send reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log(`🔄 Reset password attempt with token: ${token}`);

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      console.log(`❌ Invalid or expired reset token: ${token}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    console.log(`✅ User found for password reset: ${user.email}`);

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};