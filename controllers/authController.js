const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const Teacher = require('../models/Teacher');

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
  return nodemailer.createTransporter({
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
      process.env.EMAIL_USER === 'your-email@gmail.com') {return; // Skip sending actual email in development
  }

  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP - EduLearn',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007BFF;">Password Reset Request</h2>
        <p>Hello ${teacherName},</p>
        <p>You have requested to reset your password. Use the OTP below to proceed:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007BFF; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p><strong>Important:</strong></p>
        <ul>
          <li>This OTP is valid for 10 minutes only</li>
          <li>Do not share this OTP with anyone</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
        <p>Best regards,<br>EduLearn Team</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Controller functions
const authController = {
  // Register new teacher
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, email, password, phoneNumber, schoolName } = req.body;

      // Check if teacher already exists
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        return res.status(400).json({ message: 'Teacher with this email already exists' });
      }

      // Create new teacher
      const teacher = new Teacher({
        name,
        email,
        password,
        phoneNumber,
        schoolName
      });

      await teacher.save();

      const token = generateToken(teacher._id);

      res.status(201).json({
        message: 'Teacher registered successfully',
        token,
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phoneNumber: teacher.phoneNumber,
          schoolName: teacher.schoolName
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Teacher with this email already exists' });
      }
      res.status(500).json({ message: 'Server error during registration' });
    }
  },

  // Login teacher
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find teacher and include password for comparison
      const teacher = await Teacher.findOne({ email }).select('+password');
      if (!teacher) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const isPasswordValid = await teacher.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = generateToken(teacher._id);

      res.json({
        message: 'Login successful',
        token,
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phoneNumber: teacher.phoneNumber,
          schoolName: teacher.schoolName,
          profilePicture: teacher.profilePicture
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  },

  // Get current teacher profile
  getProfile: async (req, res) => {
    try {
      // req.teacher is set by auth middleware
      res.json({
        message: 'Profile retrieved successfully',
        teacher: {
          id: req.teacher._id,
          name: req.teacher.name,
          email: req.teacher.email,
          phoneNumber: req.teacher.phoneNumber,
          schoolName: req.teacher.schoolName,
          profilePicture: req.teacher.profilePicture
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Server error while fetching profile' });
    }
  },

  // Initiate password reset
  forgotPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(404).json({ message: 'No teacher found with this email address' });
      }

      // Generate OTP and set expiration (10 minutes)
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP and expiration to teacher document
      teacher.resetPasswordOTP = otp;
      teacher.resetPasswordExpires = otpExpires;
      await teacher.save();

      // Send OTP email
      await sendOTPEmail(email, otp, teacher.name);

      res.json({
        message: 'Password reset OTP sent to your email',
        email: email
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Error sending password reset email' });
    }
  },

  // Verify OTP
  verifyOTP: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email, otp } = req.body;

      const teacher = await Teacher.findOne({ 
        email,
        resetPasswordOTP: otp,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!teacher) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      res.json({
        message: 'OTP verified successfully',
        email: email
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: 'Error verifying OTP' });
    }
  },

  // Reset password with OTP
  resetPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email, otp, newPassword } = req.body;

      const teacher = await Teacher.findOne({ 
        email,
        resetPasswordOTP: otp,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!teacher) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Update password and clear OTP fields
      teacher.password = newPassword;
      teacher.resetPasswordOTP = undefined;
      teacher.resetPasswordExpires = undefined;
      await teacher.save();

      res.json({
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Error resetting password' });
    }
  },

  // Change password (for logged-in users)
  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get teacher with password field
      const teacher = await Teacher.findById(req.teacher._id).select('+password');
      
      // Verify current password
      const isCurrentPasswordValid = await teacher.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      teacher.password = newPassword;
      await teacher.save();

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Error changing password' });
    }
  },

  // Resend OTP
  resendOtp: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(404).json({ message: 'No teacher found with this email address' });
      }

      // Generate new OTP and set expiration (10 minutes)
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP and expiration to teacher document
      teacher.resetPasswordOTP = otp;
      teacher.resetPasswordExpires = otpExpires;
      await teacher.save();

      // Send OTP email
      await sendOTPEmail(email, otp, teacher.name);

      res.json({
        message: 'New OTP sent to your email',
        email: email
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ message: 'Error resending OTP' });
    }
  }
};

module.exports = authController;
