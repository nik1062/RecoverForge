const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Plans configured in paise
const PLANS = {
  premium: {
    amount: 99900, // ₹999 in paise
    currency: 'INR',
    credits: 1000,
    name: 'RecoverForge Premium'
  }
};

// @route POST /payments/create-order
const createOrder = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const planDetails = PLANS[plan || 'premium'];
    if (!planDetails) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    const key_id = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.trim() : '';
    const key_secret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : '';

    if (!key_id || !key_secret) {
      return res.status(500).json({ success: false, message: 'Payment gateway configuration missing.' });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const receiptId = `rcpt_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;

    const order = await razorpay.orders.create({
      amount: planDetails.amount, // stored & billed in paise
      currency: planDetails.currency,
      receipt: receiptId,
      notes: {
        userId: req.user._id.toString(),
        plan: plan || 'premium',
        userEmail: req.user.email
      }
    });

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount, // paise
        currency: order.currency,
        key: key_id,
        planName: planDetails.name,
        userEmail: req.user.email,
        userName: req.user.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /payments/verify
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : '';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body)
      .digest('hex');

    // Constant-time comparison for security
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(razorpay_signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature.' });
    }

    const planDetails = PLANS[plan || 'premium'];

    // Check duplicate payment
    const existing = await Transaction.findOne({ paymentId: razorpay_payment_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Payment has already been processed.' });
    }

    // Money is saved in paise (planDetails.amount = 99900 paise)
    const transaction = await Transaction.create({
      userId: req.user._id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature,
      amount: planDetails.amount, // PAISE
      plan: plan || 'premium',
      status: 'success'
    });

    // Update user plan & credits
    const user = await User.findById(req.user._id);
    user.plan = plan || 'premium';
    user.credits += planDetails.credits;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified! Plan updated.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /payments/transactions
const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { transactions } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, verifyPayment, getTransactions };
