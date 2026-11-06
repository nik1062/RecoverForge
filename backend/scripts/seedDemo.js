/**
 * RecoverForge Demo Data Seeder
 * Usage:
 *   npm run seed:demo
 *   npm run seed:demo -- --reset
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');

const DEMO_MERCHANT_EMAIL = process.env.DEMO_MERCHANT_EMAIL || 'demo@recoverforge.com';

const SEED_PROFILES = [
  {
    category: 'insufficient_funds',
    action: 'retry_next_morning',
    errorCode: 'BAD_REQUEST_ERROR',
    errorReason: 'payment_failed_insufficient_funds',
    errorDescription: 'Card balance insufficient to cover charge',
    method: 'card',
    status: 'recovering',
    attempts: 1,
    reasoning: 'Cardholder account balance low; recommended early morning retry after salary settlement.'
  },
  {
    category: 'bank_decline',
    action: 'suggest_other_method',
    errorCode: 'GATEWAY_ERROR',
    errorReason: 'payment_declined_by_bank',
    errorDescription: 'Issuing bank refused authorization without specific code',
    method: 'netbanking',
    status: 'recovered',
    attempts: 1,
    reasoning: 'HDFC Bank Netbanking server refused; suggested alternate UPI link and customer completed payment.'
  },
  {
    category: 'user_dropoff',
    action: 'retry_in_1_hour',
    errorCode: 'USER_DROPPED_OUT',
    errorReason: 'otp_screen_dismissed',
    errorDescription: 'Customer navigated away on 3DS verification screen',
    method: 'upi',
    status: 'recovering',
    attempts: 2,
    reasoning: 'Buyer closed payment window before entering UPI MPIN; gentle recovery sequence deployed.'
  },
  {
    category: 'technical_error',
    action: 'retry_now',
    errorCode: 'GATEWAY_TIMEOUT',
    errorReason: 'network_timeout_at_gateway',
    errorDescription: 'Payment gateway timed out during authentication',
    method: 'card',
    status: 'recovered',
    attempts: 1,
    reasoning: 'Transient network timeout; immediate retry link sent and customer paid within 15 minutes.'
  },
  {
    category: 'insufficient_funds',
    action: 'retry_next_morning',
    errorCode: 'INSUFFICIENT_FUNDS',
    errorReason: 'card_limit_exceeded',
    errorDescription: 'Daily transaction limit exceeded for cardholder',
    method: 'card',
    status: 'abandoned',
    attempts: 3,
    reasoning: 'Daily limit exceeded; 3 gentle follow-ups sent over 7 days without buyer engagement.'
  },
  {
    category: 'user_dropoff',
    action: 'retry_in_1_hour',
    errorCode: 'PAYMENT_CANCELLED',
    errorReason: 'back_button_pressed',
    errorDescription: 'User clicked cancel on bank redirection page',
    method: 'upi',
    status: 'opted_out',
    attempts: 1,
    reasoning: 'Customer abandoned checkout and clicked 1-click unsubscribe in recovery email.'
  }
];

const CUSTOMER_NAMES = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Mehta', 'Sneha Reddy',
  'Vikram Verma', 'Ananya Iyer', 'Aditya Nair', 'Pooja Joshi',
  'Kunal Singhania', 'Ishita Sen', 'Arjun Kapoor', 'Divya Nair',
  'Manish Gupta', 'Meera Rao', 'Siddharth Roy', 'Tanvi Desai',
  'Varun Chopra', 'Deepika Pillai', 'Gaurav Bhatia', 'Rhea Mukherjee'
];

async function seed(options = {}) {
  const isReset = options.reset !== undefined ? options.reset : process.argv.includes('--reset');

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri && mongoose.connection.readyState === 0) {
      console.error('Error: MONGODB_URI is required to run seed script.');
      return { success: false, reason: 'no_mongo' };
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Resolve or create Demo Merchant
    let merchant = await User.findOne({ email: DEMO_MERCHANT_EMAIL.toLowerCase() });
    if (!merchant) {
      merchant = await User.create({
        name: 'Razorpay Demo Store Operator',
        email: DEMO_MERCHANT_EMAIL.toLowerCase(),
        password: 'Password@123',
        businessName: 'Apex Cloud & SaaS Solutions',
        senderName: 'Apex Billing Support',
        replyToEmail: 'billing@apexcloud.io',
        agentActive: true,
        isVerified: true,
        plan: 'premium'
      });
    }

    // 2. Handle --reset flag
    if (isReset) {
      const deletedPayments = await FailedPayment.deleteMany({ merchantId: merchant._id, isDemoData: true });
      const deletedActions = await AgentAction.deleteMany({ merchantId: merchant._id, isDemoData: true });
      return { success: true, reset: true, deletedPayments: deletedPayments.deletedCount, deletedActions: deletedActions.deletedCount };
    }

    // 3. Check Idempotency: If demo records already exist, do not duplicate
    const existingCount = await FailedPayment.countDocuments({ merchantId: merchant._id, isDemoData: true });
    if (existingCount >= 20) {
      return { success: true, idempotent: true, count: existingCount, message: 'Already seeded' };
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const createdPayments = [];

    for (let i = 0; i < 20; i++) {
      const profile = SEED_PROFILES[i % SEED_PROFILES.length];
      const customerName = CUSTOMER_NAMES[i];
      const customerEmail = `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
      const contact = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
      
      const baseRupees = [499, 899, 1499, 2499, 3999, 5999, 8499, 12999, 18499, 24999][i % 10];
      const amountPaise = baseRupees * 100;
      
      const daysAgo = (14 - (i * 0.65));
      const createdAt = new Date(now - (daysAgo * DAY_MS));

      const paymentId = `pay_demo_${100000 + i}`;
      const orderId = `order_demo_${200000 + i}`;
      const linkId = `plink_demo_${300000 + i}`;
      const linkUrl = `https://rzp.io/l/demo_${300000 + i}`;

      let recoveredAt = null;
      let recoveredAmount = null;
      let nextActionAt = null;

      if (profile.status === 'recovered') {
        recoveredAt = new Date(createdAt.getTime() + 4 * 3600 * 1000);
        recoveredAmount = amountPaise;
      } else if (profile.status === 'recovering') {
        nextActionAt = new Date(now + 6 * 3600 * 1000);
      }

      const payment = await FailedPayment.create({
        merchantId: merchant._id,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        amount: amountPaise,
        currency: 'INR',
        customerEmail,
        customerContact: contact,
        errorCode: profile.errorCode,
        errorDescription: profile.errorDescription,
        errorReason: profile.errorReason,
        errorStep: 'payment_authentication',
        errorSource: 'customer_bank',
        method: profile.method,
        status: profile.status,
        classification: {
          category: profile.category,
          confidence: 0.88 + ((i % 5) * 0.02),
          reasoning: profile.reasoning,
          recommendedAction: profile.action
        },
        paymentLinkId: linkId,
        paymentLinkUrl: linkUrl,
        attempts: profile.attempts,
        nextActionAt,
        recoveredAt,
        recoveredAmount,
        optOutToken: crypto.randomBytes(16).toString('hex'),
        isDemoData: true,
        createdAt,
        updatedAt: recoveredAt || createdAt
      });

      createdPayments.push(payment);

      // Webhook Received
      await AgentAction.create({
        failedPaymentId: payment._id,
        merchantId: merchant._id,
        type: 'webhook_received',
        detail: `Razorpay payment.failed webhook received for ${paymentId} (Amount: ₹${(amountPaise / 100).toFixed(2)})`,
        meta: { paymentId, errorCode: profile.errorCode, method: profile.method },
        isDemoData: true,
        createdAt: new Date(createdAt.getTime() + 1000)
      });

      // Classified
      await AgentAction.create({
        failedPaymentId: payment._id,
        merchantId: merchant._id,
        type: 'classified',
        detail: `AI classified failure as ${profile.category} (Confidence: 92%): ${profile.reasoning}`,
        meta: { category: profile.category, recommendedAction: profile.action },
        isDemoData: true,
        createdAt: new Date(createdAt.getTime() + 2500)
      });

      // Link Created
      await AgentAction.create({
        failedPaymentId: payment._id,
        merchantId: merchant._id,
        type: 'link_created',
        detail: `Created fresh Razorpay recovery payment link ${linkId} valid for 48 hours`,
        meta: { paymentLinkId: linkId, short_url: linkUrl },
        isDemoData: true,
        createdAt: new Date(createdAt.getTime() + 3800)
      });

      // Email Sent
      await AgentAction.create({
        failedPaymentId: payment._id,
        merchantId: merchant._id,
        type: 'email_sent',
        detail: `Sent empathetic recovery email to ${customerEmail} (Attempt #1)`,
        meta: {
          subject: `Update regarding your transaction with Apex Cloud`,
          to: customerEmail
        },
        isDemoData: true,
        createdAt: new Date(createdAt.getTime() + 5200)
      });

      if (profile.status === 'recovered') {
        await AgentAction.create({
          failedPaymentId: payment._id,
          merchantId: merchant._id,
          type: 'recovered',
          detail: `Payment recovered! Customer settled via Razorpay Link ${linkId}. Revenue recovered: ₹${(amountPaise / 100).toFixed(2)}`,
          meta: { recoveredAmount: amountPaise },
          isDemoData: true,
          createdAt: recoveredAt
        });
      } else if (profile.status === 'opted_out') {
        await AgentAction.create({
          failedPaymentId: payment._id,
          merchantId: merchant._id,
          type: 'stopped',
          detail: `Customer ${customerEmail} clicked unsubscribe link. All follow-ups halted.`,
          isDemoData: true,
          createdAt: new Date(createdAt.getTime() + 12 * 3600 * 1000)
        });
      } else if (profile.status === 'recovering') {
        await AgentAction.create({
          failedPaymentId: payment._id,
          merchantId: merchant._id,
          type: 'followup_scheduled',
          detail: `Follow-up sequence active. Next action scheduled for ${nextActionAt.toLocaleDateString()}`,
          isDemoData: true,
          createdAt: new Date(createdAt.getTime() + 6000)
        });
      }
    }

    return { success: true, seeded: createdPayments.length };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (require.main === module && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seed().then((res) => {
    console.log('Seed Result:', res);
  });
}

module.exports = { seed, SEED_PROFILES };
