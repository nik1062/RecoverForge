const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { signup, verifyOTP, resendOTP, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Validation helper middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 attempts per IP per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

// Validation rules
const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name must not exceed 100 characters'),
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

const verifyOTPRules = [
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit numeric OTP is required')
];

const resendOTPRules = [
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail()
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const profileRules = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
];

// Routes
router.post('/signup', authLimiter, signupRules, validate, signup);
router.post('/verify-otp', authLimiter, verifyOTPRules, validate, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTPRules, validate, resendOTP);
router.post('/login', authLimiter, loginRules, validate, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, profileRules, validate, updateProfile);

module.exports = router;
