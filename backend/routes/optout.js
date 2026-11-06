const express = require('express');
const router = express.Router();
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');

// Handle customer unsubscribe / opt-out
const handleOptOut = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).send('Missing opt-out token.');
    }

    const payment = await FailedPayment.findOne({ optOutToken: token });
    if (!payment) {
      return res.status(404).send('Invalid or expired opt-out link.');
    }

    if (payment.status !== 'opted_out' && payment.status !== 'recovered') {
      payment.status = 'opted_out';
      payment.nextActionAt = null;
      await payment.save();

      await AgentAction.create({
        failedPaymentId: payment._id,
        merchantId: payment.merchantId,
        type: 'stopped',
        detail: `Customer ${payment.customerEmail} clicked unsubscribe. Payment marked opted_out; all scheduled follow-ups permanently cancelled.`,
        meta: { optOutToken: token },
        isDemoData: payment.isDemoData
      });
    }

    // Return friendly HTML confirmation
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed - RecoverForge</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0F; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #12121A; border: 1px solid #1F1F2E; border-radius: 16px; padding: 40px; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #fff; }
          p { color: #8F90A6; line-height: 1.6; margin: 0 0 24px 0; font-size: 14px; }
          .badge { display: inline-block; background: rgba(232, 255, 71, 0.1); color: #E8FF47; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>You're Unsubscribed</h1>
          <p>You will no longer receive payment reminder emails regarding this transaction.</p>
          <div class="badge">Preferences Saved</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('An error occurred while processing your request.');
  }
};

router.get('/:token', handleOptOut);
router.post('/:token', async (req, res) => {
  const { token } = req.params;
  const payment = await FailedPayment.findOne({ optOutToken: token });
  if (!payment) return res.status(404).json({ success: false, message: 'Invalid token' });
  payment.status = 'opted_out';
  payment.nextActionAt = null;
  await payment.save();
  res.status(200).json({ success: true, message: 'Unsubscribed successfully' });
});

module.exports = router;
