const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Resend } = require('resend');
const OpenAI = require('openai');
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');
const User = require('../models/User');
const { classifyFailure, calculateNextActionAt } = require('./aiClassifier');

/**
 * Format paise into Indian Rupees display string (₹1,499.00)
 */
const formatRupees = (paise) => {
  const rupees = Number(paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(rupees);
};

/**
 * Creates a fresh Razorpay Payment Link for the failed transaction.
 */
const createRecoveryLink = async (failedPayment, merchant) => {
  const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  // Generate fallback/mock link if real gateway keys are not provided in development
  if (!key_id || !key_secret || key_id.startsWith('rzp_test_placeholder')) {
    const mockId = `plink_sim_${crypto.randomBytes(6).toString('hex')}`;
    const mockUrl = `${frontendUrl}/demo-store?pay_link=${mockId}&amount=${failedPayment.amount}&paymentId=${failedPayment.razorpayPaymentId}`;
    return {
      id: mockId,
      short_url: mockUrl,
      isSimulated: true
    };
  }

  const razorpay = new Razorpay({ key_id, key_secret });
  const expireBySeconds = Math.floor(Date.now() / 1000) + (48 * 3600); // 48 hours validity

  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: failedPayment.amount, // in paise
      currency: failedPayment.currency || 'INR',
      accept_partial: false,
      description: `Payment recovery for order ${failedPayment.razorpayOrderId || failedPayment.razorpayPaymentId}`,
      customer: {
        email: failedPayment.customerEmail,
        contact: failedPayment.customerContact || undefined
      },
      notify: {
        sms: false,
        email: false // We dispatch our own custom, empathetic recovery email
      },
      reminder_enable: false,
      callback_url: `${frontendUrl}/demo-store?recovered=true&paymentId=${failedPayment.razorpayPaymentId}`,
      callback_method: 'get',
      expire_by: expireBySeconds,
      notes: {
        failedPaymentId: failedPayment._id.toString(),
        merchantId: merchant._id.toString(),
        recoveredBy: 'RecoverForge'
      }
    });

    return {
      id: paymentLink.id,
      short_url: paymentLink.short_url,
      isSimulated: false
    };
  } catch (err) {
    // If live API rejected, return safe fallback so demo flow does not crash
    const mockId = `plink_fallback_${crypto.randomBytes(6).toString('hex')}`;
    const mockUrl = `${frontendUrl}/demo-store?pay_link=${mockId}&amount=${failedPayment.amount}&error=${encodeURIComponent(err.message)}`;
    return {
      id: mockId,
      short_url: mockUrl,
      isSimulated: true,
      creationError: err.message
    };
  }
};

/**
 * Deterministic email copy fallback when OpenAI is offline or unavailable.
 */
const getFallbackEmailCopy = (category, amountFormatted, businessName, paymentLinkUrl, optOutUrl) => {
  switch (category) {
    case 'insufficient_funds':
      return {
        subject: `Update regarding your transaction with ${businessName}`,
        body: `Hi there,

We noticed your recent payment of ${amountFormatted} to ${businessName} couldn't be completed. Sometimes banking limits or balance updates cause a temporary issue.

No worries at all — your order is saved. Whenever you're ready, you can complete your payment securely using the link below:

Complete Payment: ${paymentLinkUrl}

Need to try another payment method or pay later? Just let us know.

Best regards,
${businessName}

---
If you prefer not to receive payment reminders, click here to opt out: ${optOutUrl}`
      };

    case 'technical_error':
      return {
        subject: `Technical issue with your recent payment to ${businessName}`,
        body: `Hi there,

It looks like a temporary banking network glitch interrupted your payment of ${amountFormatted} to ${businessName}.

We apologize for the inconvenience. Your checkout session has been safely preserved, and you can retry with a single click here:

Retry Payment: ${paymentLinkUrl}

Feel free to reply if you need any assistance.

Warmly,
${businessName}

---
To stop receiving follow-ups, click here to opt out: ${optOutUrl}`
      };

    case 'bank_decline':
      return {
        subject: `Your payment to ${businessName} was declined by the bank`,
        body: `Hi there,

Your recent payment of ${amountFormatted} to ${businessName} was declined by your issuing bank. This often happens due to 3D-Secure authentication rules or card limits.

You can complete your checkout using UPI, Netbanking, or another card using this secure link:

Choose Payment Method: ${paymentLinkUrl}

Thank you for your patience!

Best regards,
${businessName}

---
To opt out of future emails, click here: ${optOutUrl}`
      };

    case 'user_dropoff':
    default:
      return {
        subject: `Did you leave something behind at ${businessName}?`,
        body: `Hi there,

We noticed you didn't get a chance to finish your order of ${amountFormatted} with ${businessName}.

Everything is saved and waiting for you. You can easily pick up where you left off right here:

Finish Order: ${paymentLinkUrl}

Thank you,
${businessName}

---
Click here to opt out: ${optOutUrl}`
      };
  }
};

/**
 * Synthesizes personalized, empathetic recovery email copy via OpenAI gpt-4o-mini.
 */
const generateRecoveryEmail = async (failedPayment, merchant, attemptNumber = 1) => {
  const businessName = merchant.businessName || merchant.name || 'RecoverForge Merchant';
  const amountFormatted = formatRupees(failedPayment.amount);
  const paymentLinkUrl = failedPayment.paymentLinkUrl || 'https://rzp.io/l/demo';
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const optOutUrl = `${frontendUrl}/optout/${failedPayment.optOutToken}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-test-placeholder') || process.env.FORCE_AI_FALLBACK === 'true') {
    return getFallbackEmailCopy(failedPayment.classification?.category, amountFormatted, businessName, paymentLinkUrl, optOutUrl);
  }

  const client = new OpenAI({ apiKey, timeout: 8000 });

  const prompt = `You are a respectful, high-converting payment recovery assistant for ${businessName}.
Write a polite, empathetic recovery email to a customer whose payment of ${amountFormatted} failed due to: ${failedPayment.classification?.category || 'bank decline'}.

Context:
- Merchant: ${businessName}
- Amount: ${amountFormatted}
- Root Cause: ${failedPayment.classification?.category}
- Follow-up Sequence Attempt #: ${attemptNumber}
- Payment Link: ${paymentLinkUrl}
- Opt-out Link: ${optOutUrl}

Guidelines:
- Tone: Empathetic, supportive, professional. NO guilt trips, NO fake urgency, NO high-pressure sales tricks.
- If insufficient funds: Gentle, acknowledge timing, offer to pay when convenient.
- If technical error: Apologetic about the bank glitch, assure them their order is safe.
- If bank decline: Suggest alternate methods like UPI or another card.
- MUST include the exact payment link: ${paymentLinkUrl}
- MUST include the exact opt-out link at the bottom: ${optOutUrl}
- Keep it concise: 80-140 words.

Return ONLY a valid JSON object:
{
  "subject": "Clear, friendly subject line",
  "body": "Full text body with payment link and opt-out link included"
}`;

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an email copywriter returning strictly JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 400
    });

    const parsed = JSON.parse(res.choices[0].message.content.trim());
    return {
      subject: parsed.subject,
      body: parsed.body,
      isAiGenerated: true
    };
  } catch (err) {
    const fallback = getFallbackEmailCopy(failedPayment.classification?.category, amountFormatted, businessName, paymentLinkUrl, optOutUrl);
    fallback.isAiGenerated = false;
    fallback.fallbackReason = err.message;
    return fallback;
  }
};

/**
 * Dispatches recovery email via Resend or logs preview if key is unconfigured.
 */
const sendRecoveryEmail = async (failedPayment, merchant, emailCopy) => {
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'RecoverForge <recovery@notifications.recoverforge.com>';
  const replyTo = merchant.replyToEmail || merchant.email;

  // If RESEND_API_KEY is not configured or in sandbox simulation
  if (!resendApiKey || resendApiKey.startsWith('re_placeholder') || process.env.FORCE_EMAIL_SIMULATION === 'true') {
    return {
      sent: false,
      mode: 'simulated_preview',
      message: 'Email preview (sending disabled: RESEND_API_KEY missing)',
      subject: emailCopy.subject,
      body: emailCopy.body,
      to: failedPayment.customerEmail,
      from: fromEmail,
      replyTo
    };
  }

  const resend = new Resend(resendApiKey);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [failedPayment.customerEmail],
      reply_to: replyTo,
      subject: emailCopy.subject,
      text: emailCopy.body
    });

    return {
      sent: true,
      mode: 'live_dispatch',
      resendId: result.data?.id || result.id,
      subject: emailCopy.subject,
      body: emailCopy.body
    };
  } catch (err) {
    return {
      sent: false,
      mode: 'failed_dispatch',
      error: err.message,
      subject: emailCopy.subject,
      body: emailCopy.body
    };
  }
};

/**
 * Orchestrates the full autonomous recovery workflow for a single failed payment.
 */
const processFailedPaymentRecovery = async (failedPaymentId) => {
  const payment = await FailedPayment.findById(failedPaymentId);
  if (!payment) return;

  const merchant = await User.findById(payment.merchantId);
  if (!merchant) return;

  // Check Merchant Kill Switch
  if (merchant.agentActive === false) {
    payment.status = 'failed';
    payment.nextActionAt = null;
    await payment.save();

    await AgentAction.create({
      failedPaymentId: payment._id,
      merchantId: merchant._id,
      type: 'stopped',
      detail: 'Agent kill switch is active in merchant settings. Automatic recovery halted.',
      meta: { merchantId: merchant._id.toString() },
      isDemoData: payment.isDemoData
    });
    return;
  }

  // 1. Classification Step
  const classification = await classifyFailure(payment);
  payment.classification = {
    category: classification.category,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    recommendedAction: classification.recommendedAction
  };

  const timing = calculateNextActionAt(classification.recommendedAction);
  payment.nextActionAt = timing;

  await AgentAction.create({
    failedPaymentId: payment._id,
    merchantId: merchant._id,
    type: 'classified',
    detail: classification.isFallback
      ? `AI unavailable, fallback used: classified as ${classification.category} (${classification.reasoning})`
      : `AI classified as ${classification.category} with ${Math.round(classification.confidence * 100)}% confidence: ${classification.reasoning}`,
    meta: {
      category: classification.category,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      recommendedAction: classification.recommendedAction,
      isFallback: classification.isFallback,
      nextActionAt: timing ? timing.toISOString() : null
    },
    isDemoData: payment.isDemoData
  });

  // Strict Safety Guard: Never email suspected fraud or do_not_contact
  if (classification.category === 'fraud_suspected' || classification.recommendedAction === 'do_not_contact') {
    payment.status = 'abandoned';
    payment.nextActionAt = null;
    await payment.save();

    await AgentAction.create({
      failedPaymentId: payment._id,
      merchantId: merchant._id,
      type: 'stopped',
      detail: `Safety guard engaged: ${classification.category === 'fraud_suspected' ? 'Suspected fraud transaction' : 'Recommendation is do_not_contact'}. No recovery email will be sent.`,
      meta: { category: classification.category },
      isDemoData: payment.isDemoData
    });
    return;
  }

  // 2. Generate Razorpay Payment Link
  const linkResult = await createRecoveryLink(payment, merchant);
  payment.paymentLinkId = linkResult.id;
  payment.paymentLinkUrl = linkResult.short_url;

  await AgentAction.create({
    failedPaymentId: payment._id,
    merchantId: merchant._id,
    type: 'link_created',
    detail: linkResult.isSimulated
      ? `Generated Razorpay recovery link (simulation mode): ${linkResult.short_url}`
      : `Generated active Razorpay payment link ${linkResult.id} valid for 48 hours`,
    meta: {
      paymentLinkId: linkResult.id,
      paymentLinkUrl: linkResult.short_url,
      isSimulated: linkResult.isSimulated
    },
    isDemoData: payment.isDemoData
  });

  // 3. Generate Personalised Recovery Copy
  const emailCopy = await generateRecoveryEmail(payment, merchant, 1);

  // 4. Dispatch Email via Resend / Log Simulation
  const dispatchResult = await sendRecoveryEmail(payment, merchant, emailCopy);
  payment.attempts = 1;
  payment.status = 'recovering';
  await payment.save();

  await AgentAction.create({
    failedPaymentId: payment._id,
    merchantId: merchant._id,
    type: 'email_sent',
    detail: dispatchResult.sent
      ? `Recovery email dispatched via Resend to ${payment.customerEmail}`
      : `Email preview generated (${dispatchResult.message})`,
    meta: {
      subject: emailCopy.subject,
      body: emailCopy.body,
      to: payment.customerEmail,
      mode: dispatchResult.mode,
      emailPreview: {
        subject: emailCopy.subject,
        body: emailCopy.body,
        status: dispatchResult.mode
      }
    },
    isDemoData: payment.isDemoData
  });

  // 5. Schedule Next Follow-Up If Applicable
  if (timing) {
    await AgentAction.create({
      failedPaymentId: payment._id,
      merchantId: merchant._id,
      type: 'followup_scheduled',
      detail: `Follow-up #1 scheduled for ${timing.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} ${timing.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
      meta: { nextActionAt: timing.toISOString() },
      isDemoData: payment.isDemoData
    });
  }
};

module.exports = {
  formatRupees,
  createRecoveryLink,
  generateRecoveryEmail,
  sendRecoveryEmail,
  processFailedPaymentRecovery
};
