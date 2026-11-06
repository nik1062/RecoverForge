const cron = require('node-cron');
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');
const User = require('../models/User');
const { generateRecoveryEmail, sendRecoveryEmail } = require('./recoveryService');

/**
 * Calculates subsequent follow-up intervals based on attempt number:
 * Attempt 1: +1 day
 * Attempt 2: +3 days
 * Attempt 3: +7 days
 * Max: 3 attempts -> abandon
 */
const getNextFollowUpInterval = (attempt) => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  switch (attempt) {
    case 1:
      return new Date(Date.now() + 1 * ONE_DAY_MS);
    case 2:
      return new Date(Date.now() + 3 * ONE_DAY_MS);
    default:
      return null; // 3 or more -> abandon
  }
};

/**
 * Executes a single scheduled recovery iteration.
 * Protected against race conditions using atomic MongoDB locks.
 */
const runSchedulerTick = async () => {
  try {
    const now = new Date();

    // 1. Query candidates due for scheduled action
    const duePayments = await FailedPayment.find({
      status: 'recovering',
      nextActionAt: { $lte: now }
    }).limit(25);

    for (const due of duePayments) {
      // 2. ATOMIC LOCK: Claim job atomically to ensure concurrent ticks NEVER double-send
      const locked = await FailedPayment.findOneAndUpdate(
        {
          _id: due._id,
          status: 'recovering',
          nextActionAt: { $lte: now }
        },
        {
          $set: {
            // Set temporary forward lock (10 minutes)
            nextActionAt: new Date(now.getTime() + 10 * 60 * 1000)
          }
        },
        { new: true }
      );

      if (!locked) {
        // Already claimed by concurrent tick or recovered
        continue;
      }

      // 3. RACE SAFETY CHECK: Re-verify payment has not been recovered or opted out
      const current = await FailedPayment.findById(locked._id);
      if (!current || current.status === 'recovered' || current.status === 'opted_out') {
        continue;
      }

      const merchant = await User.findById(current.merchantId);
      if (!merchant) continue;

      // 4. Kill Switch Check
      if (merchant.agentActive === false) {
        current.status = 'failed';
        current.nextActionAt = null;
        await current.save();

        await AgentAction.create({
          failedPaymentId: current._id,
          merchantId: merchant._id,
          type: 'stopped',
          detail: 'Agent kill switch engaged by merchant. Scheduled follow-up cancelled.',
          isDemoData: current.isDemoData
        });
        continue;
      }

      const currentAttempts = current.attempts || 1;

      // 5. MAX ATTEMPTS CAP (Max 3 follow-ups)
      if (currentAttempts >= 3) {
        current.status = 'abandoned';
        current.nextActionAt = null;
        await current.save();

        await AgentAction.create({
          failedPaymentId: current._id,
          merchantId: merchant._id,
          type: 'stopped',
          detail: `Maximum follow-up cap reached (${currentAttempts} attempts sent). Recovery sequence concluded with status abandoned.`,
          meta: { totalAttempts: currentAttempts },
          isDemoData: current.isDemoData
        });
        continue;
      }

      // 6. Generate & Dispatch Follow-Up Email
      const nextAttemptNumber = currentAttempts + 1;
      const emailCopy = await generateRecoveryEmail(current, merchant, nextAttemptNumber);
      const dispatchResult = await sendRecoveryEmail(current, merchant, emailCopy);

      const nextTiming = getNextFollowUpInterval(nextAttemptNumber);
      current.attempts = nextAttemptNumber;
      current.nextActionAt = nextTiming;
      if (!nextTiming) {
        current.status = 'abandoned';
      }
      await current.save();

      await AgentAction.create({
        failedPaymentId: current._id,
        merchantId: merchant._id,
        type: 'email_sent',
        detail: dispatchResult.sent
          ? `Follow-up email #${nextAttemptNumber} dispatched via Resend to ${current.customerEmail}`
          : `Follow-up email #${nextAttemptNumber} preview generated (${dispatchResult.message})`,
        meta: {
          attempt: nextAttemptNumber,
          subject: emailCopy.subject,
          body: emailCopy.body,
          to: current.customerEmail,
          emailPreview: {
            subject: emailCopy.subject,
            body: emailCopy.body,
            status: dispatchResult.mode
          }
        },
        isDemoData: current.isDemoData
      });

      if (nextTiming) {
        await AgentAction.create({
          failedPaymentId: current._id,
          merchantId: merchant._id,
          type: 'followup_scheduled',
          detail: `Follow-up #${nextAttemptNumber + 1} scheduled for ${nextTiming.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} ${nextTiming.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
          meta: { nextActionAt: nextTiming.toISOString() },
          isDemoData: current.isDemoData
        });
      }
    }
  } catch (err) {
    console.error('Scheduler error during tick:', err.message);
  }
};

let schedulerTask = null;

const initScheduler = () => {
  if (process.env.NODE_ENV === 'test') {
    return; // Don't run automated cron loops during unit tests
  }

  // Run every minute
  schedulerTask = cron.schedule('* * * * *', () => {
    runSchedulerTick();
  });

  console.log('⏱️  RecoverForge follow-up scheduler active (running every minute)');
};

const stopScheduler = () => {
  if (schedulerTask) {
    schedulerTask.stop();
  }
};

module.exports = {
  initScheduler,
  stopScheduler,
  runSchedulerTick,
  getNextFollowUpInterval
};
