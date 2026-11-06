const mongoose = require('mongoose');

const failedPaymentSchema = new mongoose.Schema({
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  razorpayOrderId: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true // ALWAYS stored in paise (e.g. ₹999 = 99900)
  },
  currency: {
    type: String,
    default: 'INR'
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customerContact: {
    type: String,
    trim: true,
    default: ''
  },
  errorCode: {
    type: String,
    default: ''
  },
  errorDescription: {
    type: String,
    default: ''
  },
  errorReason: {
    type: String,
    default: ''
  },
  errorStep: {
    type: String,
    default: ''
  },
  errorSource: {
    type: String,
    default: ''
  },
  method: {
    type: String,
    default: 'card' // upi, card, netbanking, wallet, etc.
  },
  status: {
    type: String,
    enum: ['failed', 'recovering', 'recovered', 'abandoned', 'opted_out'],
    default: 'failed',
    index: true
  },
  classification: {
    category: {
      type: String,
      enum: ['insufficient_funds', 'bank_decline', 'user_dropoff', 'technical_error', 'fraud_suspected', 'unclassified'],
      default: 'unclassified'
    },
    confidence: {
      type: Number,
      default: 0
    },
    reasoning: {
      type: String,
      default: ''
    },
    recommendedAction: {
      type: String,
      enum: ['retry_now', 'retry_next_morning', 'retry_in_1_hour', 'suggest_other_method', 'do_not_contact', 'none'],
      default: 'none'
    }
  },
  paymentLinkId: {
    type: String,
    default: null
  },
  paymentLinkUrl: {
    type: String,
    default: null
  },
  attempts: {
    type: Number,
    default: 0
  },
  nextActionAt: {
    type: Date,
    default: null,
    index: true
  },
  recoveredAt: {
    type: Date,
    default: null
  },
  recoveredAmount: {
    type: Number,
    default: null // In paise
  },
  optOutToken: {
    type: String,
    index: true
  },
  isDemoData: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

// Compound indexes for high-throughput queries and scheduler polling
failedPaymentSchema.index({ merchantId: 1, createdAt: -1 });
failedPaymentSchema.index({ status: 1, nextActionAt: 1 });
failedPaymentSchema.index({ merchantId: 1, status: 1 });

module.exports = mongoose.model('FailedPayment', failedPaymentSchema);
