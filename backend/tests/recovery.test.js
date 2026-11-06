const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_123456';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_key_7890';

const app = require('../server');
const WebhookEvent = require('../models/WebhookEvent');
const FailedPayment = require('../models/FailedPayment');
const AgentAction = require('../models/AgentAction');
const User = require('../models/User');
const { ruleBasedClassification, calculateNextActionAt } = require('../services/aiClassifier');
const { getNextFollowUpInterval } = require('../services/schedulerService');

describe('RecoverForge Core Verification Suite', () => {
  beforeAll(async () => {
    // Connect to in-memory or test MongoDB if available, else mock schemas
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recoverforge_test';
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    } catch (e) {
      // If local mongo is not running, unit tests test pure logic & mock handlers
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health returns 200 with service info', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('RecoverForge API');
    });
  });

  describe('2. Webhook Signature Verification', () => {
    it('rejects webhook with invalid signature with 400', async () => {
      const payload = JSON.stringify({
        event: 'payment.failed',
        payload: { payment: { entity: { id: 'pay_test_123', amount: 99900 } } }
      });

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', 'invalid_signature_hash_hex')
        .set('X-Razorpay-Event-Id', 'evt_test_bad_sig')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid webhook signature/i);
    });

    it('accepts webhook with valid HMAC-SHA256 signature with 200', async () => {
      const payloadObj = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_test_${Date.now()}`,
              amount: 149900,
              currency: 'INR',
              email: 'buyer@test.com',
              error_code: 'BAD_REQUEST_ERROR',
              error_reason: 'insufficient_funds'
            }
          }
        }
      };
      const rawPayload = JSON.stringify(payloadObj);
      const validSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      const eventId = `evt_test_${Date.now()}`;

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', validSig)
        .set('X-Razorpay-Event-Id', eventId)
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('received');
    });
  });

  describe('3. Webhook Idempotency', () => {
    it('returns ignored_duplicate when exact same X-Razorpay-Event-Id is sent twice', async () => {
      const eventId = `evt_idem_${Date.now()}`;
      const payload = JSON.stringify({ event: 'payment.failed', payload: {} });
      const validSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      // First delivery
      const res1 = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', validSig)
        .set('X-Razorpay-Event-Id', eventId)
        .send(payload);

      expect(res1.status).toBe(200);

      // Replayed second delivery
      const res2 = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', validSig)
        .set('X-Razorpay-Event-Id', eventId)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('ignored_duplicate');
    });
  });

  describe('4. AI Classifier & Rule-based Fallback Path', () => {
    it('correctly classifies insufficient funds via fallback', () => {
      const payment = {
        amount: 250000,
        errorCode: 'BAD_REQUEST_ERROR',
        errorReason: 'payment_failed_insufficient_funds',
        errorDescription: 'Not enough balance on card'
      };
      const result = ruleBasedClassification(payment);
      expect(result.category).toBe('insufficient_funds');
      expect(result.recommendedAction).toBe('retry_next_morning');
      expect(result.isFallback).toBe(true);
    });

    it('correctly identifies fraud_suspected and recommends do_not_contact', () => {
      const payment = {
        amount: 500000,
        errorCode: 'SECURITY_VIOLATION',
        errorReason: 'stolen_card_blacklisted',
        errorDescription: 'High risk transaction blocked by risk shield'
      };
      const result = ruleBasedClassification(payment);
      expect(result.category).toBe('fraud_suspected');
      expect(result.recommendedAction).toBe('do_not_contact');
    });

    it('calculates nextActionAt timing properly for retry_next_morning in IST', () => {
      const timing = calculateNextActionAt('retry_next_morning');
      expect(timing).toBeInstanceOf(Date);
      expect(timing.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('5. Scheduler Follow-up Interval & Attempt Limits', () => {
    it('calculates correct intervals and caps at 3 attempts', () => {
      const t1 = getNextFollowUpInterval(1);
      const t2 = getNextFollowUpInterval(2);
      const t3 = getNextFollowUpInterval(3);

      expect(t1.getTime()).toBeGreaterThan(Date.now());
      expect(t2.getTime()).toBeGreaterThan(t1.getTime());
      expect(t3).toBeNull(); // 3 or more is capped (abandoned)
    });
  });
});
