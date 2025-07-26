const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Teacher = require('../models/Teacher');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email transporter setup
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, teacherName) => {
  // For development, log OTP to console if email is not configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
      process.env.EMAIL_USER === 'your-email@gmail.com') {
    console.log(`
=================================
🔐 PASSWORD RESET OTP
=================================
Email: ${email}
Name: ${teacherName}
OTP: ${otp}
Expires: 10 minutes
=================================
    `);
    return; // Skip sending actual email in development
  }

  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'EduLearn - Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">EduLearn Password Reset</h2>
        <p>Hello ${teacherName},</p>
        <p>You have requested to reset your password. Please use the following OTP to verify your identity:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated email from EduLearn. Please do not reply to this email.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// @route   POST /api/auth/register
// @desc    Register a new teacher
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Teacher with this email already exists' });
    }

    // Create new teacher
    const teacher = new Teacher({
      name,
      email,
      password
    });

    await teacher.save();

    // Generate token
    const token = generateToken(teacher._id);

    res.status(201).json({
      message: 'Teacher registered successfully',
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || '',
        school: teacher.school || '',
        subject: teacher.subject || '',
        profilePicture: teacher.profilePicture,
        role: teacher.role,
        isActive: teacher.isActive,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
        lastLogin: teacher.lastLogin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login teacher
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ email, isActive: true }).select('+password');
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await teacher.updateLastLogin();

    // Generate token
    const token = generateToken(teacher._id);

    res.json({
      message: 'Login successful',
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || '',
        school: teacher.school || '',
        subject: teacher.subject || '',
        profilePicture: teacher.profilePicture,
        role: teacher.role,
        isActive: teacher.isActive,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
        lastLogin: teacher.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current teacher info
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      teacher: {
        id: req.teacher._id,
        name: req.teacher.name,
        email: req.teacher.email,
        profilePicture: req.teacher.profilePicture,
        role: req.teacher.role,
        lastLogin: req.teacher.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update teacher profile
// @access  Private
router.put('/profile', authMiddleware, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name } = req.body;
    const teacher = await Teacher.findById(req.teacher._id);

    if (name) teacher.name = name;

    await teacher.save();

    res.json({
      message: 'Profile updated successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        profilePicture: teacher.profilePicture,
        role: teacher.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ email, isActive: true });
    if (!teacher) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    teacher.passwordResetOTP = otp;
    teacher.passwordResetOTPExpires = otpExpires;
    teacher.passwordResetOTPVerified = false;
    await teacher.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, teacher.name);
      res.json({
        message: 'Password reset OTP has been sent to your email',
        success: true
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, otp } = req.body;

    // Find teacher with OTP data
    const teacher = await Teacher.findOne({ 
      email, 
      isActive: true 
    }).select('+passwordResetOTP +passwordResetOTPExpires +passwordResetOTPVerified');

    if (!teacher) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Check if OTP exists and is not expired
    if (!teacher.passwordResetOTP || !teacher.passwordResetOTPExpires) {
      return res.status(400).json({ message: 'No OTP request found. Please request a new OTP.' });
    }

    if (teacher.passwordResetOTPExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    // Verify OTP
    if (teacher.passwordResetOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Mark OTP as verified
    teacher.passwordResetOTPVerified = true;
    await teacher.save();

    res.json({
      message: 'OTP verified successfully',
      success: true
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with verified OTP
// @access  Public
router.post('/reset-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, otp, newPassword } = req.body;

    // Find teacher with OTP data
    const teacher = await Teacher.findOne({ 
      email, 
      isActive: true 
    }).select('+passwordResetOTP +passwordResetOTPExpires +passwordResetOTPVerified');

    if (!teacher) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Check if OTP exists and is verified
    if (!teacher.passwordResetOTP || !teacher.passwordResetOTPVerified) {
      return res.status(400).json({ message: 'OTP not verified. Please verify OTP first.' });
    }

    // Check if OTP is not expired
    if (teacher.passwordResetOTPExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    // Verify OTP one more time
    if (teacher.passwordResetOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // Update password
    teacher.password = newPassword;
    teacher.passwordResetOTP = undefined;
    teacher.passwordResetOTPExpires = undefined;
    teacher.passwordResetOTPVerified = undefined;
    await teacher.save();

    res.json({
      message: 'Password has been reset successfully',
      success: true
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;
