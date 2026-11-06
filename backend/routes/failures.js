const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { processFailedPaymentRecovery } = require('../services/recoveryService');

// All failure management routes require JWT authentication
router.use(protect);

// GET /failures - Paginated list and dashboard metrics
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      includeDemo = 'true'
    } = req.query;

    const query = { merchantId: req.user._id };

    if (includeDemo === 'false') {
      query.isDemoData = { $ne: true };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query['classification.category'] = category;
    }

    if (search) {
      query.$or = [
        { customerEmail: { $regex: search, $options: 'i' } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } }
      ];
    }

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const [items, total, allStats] = await Promise.all([
      FailedPayment.find(query)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      FailedPayment.countDocuments(query),
      // Aggregate overview metrics based on the active demo filter
      FailedPayment.find({
        merchantId: req.user._id,
        ...(includeDemo === 'false' ? { isDemoData: { $ne: true } } : {})
      })
    ]);

    // Calculate Dashboard Overview Cards (ALL AMOUNTS IN PAISE)
    let totalFailedCount = 0;
    let totalRecoveredCount = 0;
    let contactedCount = 0;
    let revenueRecoveredPaise = 0;
    let revenueAtRiskPaise = 0;

    for (const p of allStats) {
      totalFailedCount += 1;
      if (p.status === 'recovered') {
        totalRecoveredCount += 1;
        revenueRecoveredPaise += (p.recoveredAmount || p.amount || 0);
      } else if (p.status === 'recovering' || p.status === 'failed') {
        revenueAtRiskPaise += (p.amount || 0);
      }

      if (p.attempts > 0 || p.status === 'recovering' || p.status === 'recovered' || p.status === 'abandoned' || p.status === 'opted_out') {
        contactedCount += 1;
      }
    }

    const recoveryRate = totalFailedCount > 0
      ? Math.round((totalRecoveredCount / totalFailedCount) * 1000) / 10
      : 0;

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit) || 1
      },
      metrics: {
        totalFailed: totalFailedCount,
        totalRecovered: totalRecoveredCount,
        recoveryRate, // e.g. 42.5%
        revenueRecovered: revenueRecoveredPaise, // in paise
        revenueAtRisk: revenueAtRiskPaise,       // in paise
        funnel: {
          failed: totalFailedCount,
          contacted: contactedCount,
          recovered: totalRecoveredCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /failures/:id - Single failure details
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await FailedPayment.findOne({
      _id: req.params.id,
      merchantId: req.user._id
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Failed payment record not found.' });
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

// GET /failures/:id/timeline - Live AgentAction audit trail
router.get('/:id/timeline', async (req, res, next) => {
  try {
    const payment = await FailedPayment.findOne({
      _id: req.params.id,
      merchantId: req.user._id
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Failed payment not found.' });
    }

    const timeline = await AgentAction.find({ failedPaymentId: payment._id })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        payment,
        timeline
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /failures/simulate - Admin & Merchant Demo Tool (Runs FULL real pipeline)
router.post('/simulate', async (req, res, next) => {
  try {
    const {
      amount = 149900, // ₹1,499 default in paise
      customerEmail = 'demo.buyer@example.com',
      errorCode = 'BAD_REQUEST_ERROR',
      errorReason = 'insufficient_funds',
      method = 'card'
    } = req.body;

    const paymentId = `pay_sim_${crypto.randomBytes(6).toString('hex')}`;
    const orderId = `order_sim_${crypto.randomBytes(6).toString('hex')}`;

    // Create the failed payment record
    const failedPayment = await FailedPayment.create({
      merchantId: req.user._id,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      amount: parseInt(amount) || 149900,
      currency: 'INR',
      customerEmail: customerEmail.toLowerCase().trim(),
      customerContact: '+919876543210',
      errorCode: errorCode || 'BAD_REQUEST_ERROR',
      errorDescription: 'Transaction was declined: balance too low for charge.',
      errorReason: errorReason || 'insufficient_funds',
      errorStep: 'payment_authentication',
      errorSource: 'issuing_bank',
      method: method || 'card',
      status: 'failed',
      optOutToken: crypto.randomBytes(16).toString('hex'),
      isDemoData: true // marked for clean demo filtering
    });

    // Log initial timeline action
    await AgentAction.create({
      failedPaymentId: failedPayment._id,
      merchantId: req.user._id,
      type: 'webhook_received',
      detail: `[DEMO SIMULATOR] Simulated Razorpay failure webhook received for ${paymentId} (Amount: ₹${(failedPayment.amount / 100).toFixed(2)})`,
      meta: {
        paymentId,
        errorCode: failedPayment.errorCode,
        errorReason: failedPayment.errorReason,
        isSimulated: true
      },
      isDemoData: true
    });

    // Run the full autonomous recovery pipeline
    await processFailedPaymentRecovery(failedPayment._id);

    const updatedPayment = await FailedPayment.findById(failedPayment._id);
    const timeline = await AgentAction.find({ failedPaymentId: failedPayment._id }).sort({ createdAt: 1 });

    res.status(201).json({
      success: true,
      message: 'Payment failure simulated and autonomous recovery pipeline executed successfully!',
      data: {
        payment: updatedPayment,
        timeline
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /failures/settings - Update merchant configuration & kill switch
router.put('/settings', async (req, res, next) => {
  try {
    const { businessName, senderName, replyToEmail, agentActive } = req.body;
    const updates = {};

    if (businessName !== undefined) updates.businessName = businessName;
    if (senderName !== undefined) updates.senderName = senderName;
    if (replyToEmail !== undefined) updates.replyToEmail = replyToEmail;
    if (agentActive !== undefined) updates.agentActive = Boolean(agentActive);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Agent recovery settings updated.',
      user
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
