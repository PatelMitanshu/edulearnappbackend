const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 forgot password requests per windowMs
  message: 'Too many password reset attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const registerValidation = [
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
    .withMessage('Password must be at least 8 characters long'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please enter a valid phone number'),
  body('school')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('School name cannot exceed 100 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subject cannot exceed 50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

const verifyOtpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Routes
router.post('/register', authLimiter, registerValidation, handleValidationErrors, authController.register);
router.post('/login', authLimiter, loginValidation, handleValidationErrors, authController.login);
router.get('/me', authMiddleware, authController.getProfile);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, authController.resetPassword);
router.post('/verify-otp', verifyOtpValidation, handleValidationErrors, authController.verifyOTP);
router.post('/resend-otp', forgotPasswordLimiter, forgotPasswordValidation, handleValidationErrors, authController.resendOtp);

module.exports = router;
