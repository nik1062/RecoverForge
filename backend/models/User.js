const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
  email: {
    type: String, required: [true, 'Email is required'], unique: true,
    lowercase: true, trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  isVerified: { type: Boolean, default: false },
  credits: { type: Number, default: 50 },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  otp: { type: String, select: false },
  otpExpiry: { type: Date, select: false },
  role: { type: String, default: '' },
  goal: { type: String, default: '' },
  preferences: {
    tone: { type: String, default: 'professional' },
    emailLength: { type: String, default: 'medium' },
    industry: { type: String, default: '' }
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateOTP = function () {
  const otp = crypto.randomInt(100000, 1000000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

userSchema.methods.verifyOTP = function (candidateOTP) {
  return this.otp === candidateOTP && this.otpExpiry > new Date();
};

module.exports = mongoose.model('User', userSchema);
