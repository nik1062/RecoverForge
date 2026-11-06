# RecoverForge — Architecture Specification
**Razorpay AI Buildathon — Track 3: AI Revenue Recovery**

---

## 1. High-Level System Design

RecoverForge is engineered as an event-driven, autonomous revenue recovery agent. It integrates directly with Razorpay's payment infrastructure via bidirectional webhooks and API calls:

```
[Razorpay Core Gateway] 
        │
 (payment.failed)
        ▼
[POST /webhooks/razorpay] ──► [HMAC SHA256 Verification (Raw Buffer)]
                                         │
                                   [Idempotency Gate]
                                         │
                              [Async Worker Pipeline]
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
               [AI Telemetry Classifier]      [Safety Policy Filter]
               (GPT-4o-mini / Fallback)       (Fraud / Unsub Check)
                         │                               │
                         └───────────────┬───────────────┘
                                         ▼
                        [Razorpay Payment Link Factory]
                        (razorpay.paymentLink.create)
                                         │
                                         ▼
                       [Empathetic Copy Synthesis Engine]
                                         │
                                         ▼
                      [Resend Dispatch / Preview Capture]
                                         │
                                         ▼
                        [node-cron Atomic State Machine]
                        (3-Cadence Exponential Schedule)
```

---

## 2. Component Breakdown

### A. Raw Webhook Stream Ingestion (`routes/webhook.js`)
* **Problem Solved:** Webhook signature verification fails if an Express body parser modifies whitespace or parses JSON before HMAC calculation.
* **Architecture:** Mounted with `express.raw({ type: 'application/json' })` strictly for `/webhooks`, while global `express.json()` handles remaining REST APIs.
* **Security:** `crypto.timingSafeEqual` prevents timing attack leaks.
* **Idempotency:** `X-Razorpay-Event-Id` persisted in `WebhookEvent`. Replayed events return HTTP 200 with `{ status: 'ignored_duplicate' }`.

### B. Dual-Tier Failure Classifier (`services/aiClassifier.js`)
* **Prompt Isolation:** Telemetry (`errorCode`, `errorReason`, `errorStep`, `errorSource`) wrapped inside `<telemetry_data>` XML delimiters to block prompt injection from user-controlled inputs.
* **Output Guarantee:** Enforces `response_format: { type: 'json_object' }`.
* **Heuristic Safety Fallback:** If OpenAI times out (8s limit) or errors, deterministic keyword mapping categorizes the failure and logs `"AI unavailable, fallback used"`.
* **Zero-Contact Policy:** `fraud_suspected` or `do_not_contact` categories immediately halt outreach and mark transactions `abandoned`.

### C. Link Creation & Outreach Engine (`services/recoveryService.js`)
* **Precision Accounting:** Money is stored in integer paise throughout the database and APIs. Conversion to Indian Rupees (`amount / 100`) occurs solely at presentation layer.
* **Payment Link Generation:** Razorpay's Payment Links API creates dedicated links with 48-hour expiration.
* **Unsubscribe / Opt-Out:** Every recovery email embeds a cryptographically unique `optOutToken`. Clicking `GET /optout/:token` immediately halts the recovery cadence and updates state.

### D. Concurrency-Safe Cadence Scheduler (`services/schedulerService.js`)
* **Race Condition Prevention:** The scheduler uses MongoDB's atomic `findOneAndUpdate` to claim candidate jobs with a temporary forward lock buffer.
* **Recovery Verification:** Re-verifies payment status before dispatch to prevent emailing customers who have already paid.
* **Cadence Limits:** Strict maximum cap of 3 follow-up attempts (+1 day, +3 days, +7 days), transitioning to `abandoned`.

---

## 3. Data Flow & State Machine

```
[Failed] 
   │
   ▼ (Webhook Ingested & Classified)
[Recovering] ◄─── (Cron Cadence #1, #2, #3)
   │
   ├───► (payment_link.paid / payment.captured) ───► [Recovered] (HALT)
   ├───► (Customer clicks /optout/:token)      ───► [Opted Out] (HALT)
   └───► (Max 3 attempts exceeded)              ───► [Abandoned] (HALT)
```
