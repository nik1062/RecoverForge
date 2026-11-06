const mongoose = require('mongoose');

const agentActionSchema = new mongoose.Schema({
  failedPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FailedPayment',
    required: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'webhook_received',
      'classified',
      'link_created',
      'email_sent',
      'followup_scheduled',
      'recovered',
      'stopped',
      'error'
    ],
    required: true
  },
  detail: {
    type: String,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isDemoData: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

agentActionSchema.index({ failedPaymentId: 1, createdAt: 1 });

module.exports = mongoose.model('AgentAction', agentActionSchema);
