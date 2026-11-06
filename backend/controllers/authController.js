const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendOTPEmail } = require('../utils/sendEmail');

// @desc  Signup
// @route POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // If exists but not verified, update and resend
    let user = existingUser;
    if (!user) {
      user = new User({ name, email: email.toLowerCase(), password });
    } else {
      user.name = name;
      user.password = password;
      user.isVerified = false; // Ensure it stays unverified
    }

    const otp = user.generateOTP();
    // No manual hashing here, model.pre('save') handles it.
    await user.save();

    try {
      await sendOTPEmail(email, name, otp);
    } catch (emailError) {
      // Don't fail signup if email fails in dev
      if (process.env.NODE_ENV === 'production') throw emailError;
    }

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email. Please verify.',
      email
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Verify OTP
// @route POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiry');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified.' });
    }
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Use updateOne to avoid validation errors with unselected required fields like 'password'
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { isVerified: true },
        $unset: { otp: 1, otpExpiry: 1 }
      }
    );

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: 'Account verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan,
        isVerified: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Resend OTP
// @route POST /api/auth/resend-otp
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified.' });
    }

    const otp = user.generateOTP();
    // Use updateOne to avoid validation errors
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { otp: user.otp, otpExpiry: user.otpExpiry }
      }
    );

    try {
      await sendOTPEmail(email, user.name, otp);
    } catch (emailError) {
      if (process.env.NODE_ENV === 'production') throw emailError;
    }

    res.status(200).json({ success: true, message: 'New OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc  Login
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email first.', requireVerification: true, email });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan,
        isVerified: user.isVerified,
        role: user.role,
        goal: user.goal,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get current user
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan,
        isVerified: user.isVerified,
        role: user.role,
        goal: user.goal,
        preferences: user.preferences,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Update profile
// @route PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, role, goal, preferences } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (goal !== undefined) updateData.goal = goal;
    if (preferences) {
      // For nested objects like preferences, we might want to be careful with shallow merging
      // but here we follow the existing logic of merging
      const user = await User.findById(req.user._id);
      updateData.preferences = { ...user.preferences, ...preferences };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated.',
      user: { 
        id: updatedUser._id, 
        name: updatedUser.name, 
        email: updatedUser.email, 
        credits: updatedUser.credits, 
        plan: updatedUser.plan, 
        role: updatedUser.role, 
        goal: updatedUser.goal, 
        preferences: updatedUser.preferences 
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, verifyOTP, resendOTP, login, getMe, updateProfile };
