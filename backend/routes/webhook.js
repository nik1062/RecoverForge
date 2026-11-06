const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const WebhookEvent = require('../models/WebhookEvent');
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');
const User = require('../models/User');
const { processFailedPaymentRecovery } = require('../services/recoveryService');

/**
 * Validates Razorpay Webhook HMAC-SHA256 signature using timing-safe comparison.
 */
const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (!signature || !secret || !rawBody) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
};

// POST /webhooks/razorpay
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const eventId = req.headers['x-razorpay-event-id'];
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

  // 1. Validate signature presence and secret configuration
  if (!secret) {
    console.error('Webhook error: RAZORPAY_WEBHOOK_SECRET is not configured on server.');
    return res.status(500).json({ success: false, message: 'Server webhook secret unconfigured' });
  }

  const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const isValid = verifyWebhookSignature(rawBuffer, signature, secret);

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  // Parse JSON safely from raw body
  let payload;
  try {
    payload = JSON.parse(rawBuffer.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  const eventName = payload.event;

  // 2. Idempotency Check by X-Razorpay-Event-Id
  if (eventId) {
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      return res.status(200).json({ status: 'ignored_duplicate', eventId });
    }
    await WebhookEvent.create({ eventId, eventType: eventName || 'unknown' });
  }

  // Respond 200 immediately to acknowledge gateway, process asynchronously
  res.status(200).json({ status: 'received', event: eventName });

  // 3. Asynchronous Event Dispatching
  setImmediate(async () => {
    try {
      if (eventName === 'payment.failed') {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) return;

        // Check duplicate failed payment record
        const existing = await FailedPayment.findOne({ razorpayPaymentId: paymentEntity.id });
        if (existing) return;

        // Resolve Merchant
        const notes = paymentEntity.notes || {};
        let merchantId = notes.merchantId || process.env.DEFAULT_MERCHANT_ID;
        let merchant = null;

        if (merchantId) {
          merchant = await User.findById(merchantId);
        }
        if (!merchant) {
          // Fallback to first verified merchant user
          merchant = await User.findOne({ isVerified: true }).sort({ createdAt: 1 });
        }
        if (!merchant) {
          // Seed fallback system merchant if no user exists
          merchant = await User.create({
            name: 'Demo Merchant',
            email: 'merchant@recoverforge.com',
            password: crypto.randomBytes(16).toString('hex'),
            businessName: 'RecoverForge Demo Store',
            isVerified: true
          });
        }

        // Create FailedPayment record (amount strictly in paise)
        const failedPayment = await FailedPayment.create({
          merchantId: merchant._id,
          razorpayPaymentId: paymentEntity.id,
          razorpayOrderId: paymentEntity.order_id || null,
          amount: paymentEntity.amount, // stored in paise
          currency: paymentEntity.currency || 'INR',
          customerEmail: (paymentEntity.email || 'customer@example.com').toLowerCase(),
          customerContact: paymentEntity.contact || '',
          errorCode: paymentEntity.error_code || '',
          errorDescription: paymentEntity.error_description || '',
          errorReason: paymentEntity.error_reason || '',
          errorStep: paymentEntity.error_step || '',
          errorSource: paymentEntity.error_source || '',
          method: paymentEntity.method || 'card',
          status: 'failed',
          optOutToken: crypto.randomBytes(16).toString('hex')
        });

        // Log Timeline: Webhook Received (Sanitized: NO PII like card numbers or phone logs)
        await AgentAction.create({
          failedPaymentId: failedPayment._id,
          merchantId: merchant._id,
          type: 'webhook_received',
          detail: `Razorpay payment.failed webhook received for payment ${paymentEntity.id} (Amount: ₹${(paymentEntity.amount / 100).toFixed(2)})`,
          meta: {
            paymentId: paymentEntity.id,
            errorCode: paymentEntity.error_code,
            errorReason: paymentEntity.error_reason,
            method: paymentEntity.method
          }
        });

        // Trigger autonomous agent recovery pipeline
        await processFailedPaymentRecovery(failedPayment._id);

      } else if (eventName === 'payment_link.paid') {
        const linkEntity = payload.payload?.payment_link?.entity;
        if (!linkEntity) return;

        const linkId = linkEntity.id;
        const failedPaymentId = linkEntity.notes?.failedPaymentId;

        const payment = await FailedPayment.findOne({
          $or: [
            { paymentLinkId: linkId },
            ...(failedPaymentId ? [{ _id: failedPaymentId }] : [])
          ]
        });

        if (payment && payment.status !== 'recovered') {
          payment.status = 'recovered';
          payment.recoveredAt = new Date();
          payment.recoveredAmount = linkEntity.amount_paid || linkEntity.amount || payment.amount;
          payment.nextActionAt = null;
          await payment.save();

          await AgentAction.create({
            failedPaymentId: payment._id,
            merchantId: payment.merchantId,
            type: 'recovered',
            detail: `Payment successfully recovered via Razorpay Link ${linkId}! Amount: ₹${(payment.recoveredAmount / 100).toFixed(2)}`,
            meta: {
              paymentLinkId: linkId,
              recoveredAmount: payment.recoveredAmount
            },
            isDemoData: payment.isDemoData
          });
        }

      } else if (eventName === 'payment.captured') {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) return;

        const payment = await FailedPayment.findOne({
          $or: [
            { razorpayPaymentId: paymentEntity.id },
            { razorpayOrderId: paymentEntity.order_id }
          ]
        });

        if (payment && payment.status !== 'recovered') {
          payment.status = 'recovered';
          payment.recoveredAt = new Date();
          payment.recoveredAmount = paymentEntity.amount || payment.amount;
          payment.nextActionAt = null;
          await payment.save();

          await AgentAction.create({
            failedPaymentId: payment._id,
            merchantId: payment.merchantId,
            type: 'recovered',
            detail: `Customer completed payment directly. Payment ${paymentEntity.id} captured! Amount: ₹${(payment.recoveredAmount / 100).toFixed(2)}`,
            meta: { paymentId: paymentEntity.id, amount: paymentEntity.amount },
            isDemoData: payment.isDemoData
          });
        }

      } else if (eventName === 'payment_link.expired') {
        const linkEntity = payload.payload?.payment_link?.entity;
        if (!linkEntity) return;

        const payment = await FailedPayment.findOne({ paymentLinkId: linkEntity.id });
        if (payment && payment.status === 'recovering') {
          await AgentAction.create({
            failedPaymentId: payment._id,
            merchantId: payment.merchantId,
            type: 'stopped',
            detail: `Payment link ${linkEntity.id} expired. Follow-up scheduler will determine next action.`,
            meta: { paymentLinkId: linkEntity.id },
            isDemoData: payment.isDemoData
          });
        }
      }
    } catch (err) {
      console.error('Async webhook processing error:', err.message);
    }
  });
});

module.exports = router;
