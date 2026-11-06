# RecoverForge — Engineering Challenges & Technical Solutions
**Documented Real-World Problems Encountered During Buildathon Development**

---

### Challenge 1: Webhook HMAC Signature Mismatch with Global JSON Parsers
* **Root Cause:** Standard Express applications mount `app.use(express.json())` globally. This parses the request body into a JavaScript object and re-serializes or discards the exact byte stream sent by Razorpay. Because HMAC-SHA256 is byte-sensitive, any slight modification in whitespace or key order alters the computed digest, causing legitimate Razorpay webhooks to be rejected with HTTP 400.
* **Solution:** We scoped `express.raw({ type: 'application/json' })` strictly to the `/webhooks` router *before* `express.json()` is registered. The raw Buffer is passed directly to `crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex')`, and compared with `crypto.timingSafeEqual`. In Nginx, we disabled `proxy_buffering` and `gzip` for `/webhooks/` to preserve raw byte integrity.

---

### Challenge 2: Duplicate Deliveries & Webhook Replay Idempotency
* **Root Cause:** Payment gateways implement automatic exponential backoff retry mechanisms. If an acknowledgment response exceeds gateway timeout or experiences network jitter, Razorpay re-transmits the identical webhook. Without idempotency guards, this creates duplicate `FailedPayment` records, generates multiple payment links, and bombards customers with duplicate emails.
* **Solution:** Razorpay sends a unique header: `X-Razorpay-Event-Id`. We created a dedicated `WebhookEvent` model with a unique index on `eventId`. Before initiating recovery logic, the system checks whether the event ID has already been recorded. Replayed webhooks return HTTP 200 with `{ status: 'ignored_duplicate' }` in under 10 milliseconds without touching the AI or notification pipeline.

---

### Challenge 3: Concurrency Race Conditions & Double-Send in the Cron Scheduler
* **Root Cause:** If a scheduled cron job runs every minute and processing a batch of emails takes 45 seconds, a second cron tick could query the same candidate payments whose `nextActionAt <= now` and dispatch duplicate emails to the same customer. Similarly, if a customer pays via Razorpay at the exact moment the cron tick runs, a stale query might send a follow-up email for an already-settled payment.
* **Solution:** We implemented an atomic state lock using MongoDB's `findOneAndUpdate`:
  ```javascript
  const locked = await FailedPayment.findOneAndUpdate(
    { _id: due._id, status: 'recovering', nextActionAt: { $lte: now } },
    { $set: { nextActionAt: new Date(now.getTime() + 10 * 60 * 1000) } }, // 10-minute forward lease
    { new: true }
  );
  if (!locked) continue; // Claimed by concurrent tick
  ```
  Immediately prior to sending, the worker performs a fresh lookup to guarantee the payment has not transitioned to `recovered` or `opted_out`.

---

### Challenge 4: LLM Response Drift, Delays & JSON Schema Reliability
* **Root Cause:** External LLM APIs can occasionally time out, experience latency spikes, or return markdown code blocks (```json ... ```) rather than clean JSON. For an automated payment recovery engine, an unhandled LLM exception would stall the recovery pipeline and prevent the payment link from reaching the buyer.
* **Solution:** We enforced strict structured outputs using OpenAI's `response_format: { type: 'json_object' }` and wrapped customer telemetry inside XML delimiters to prevent prompt injection. Crucially, we engineered a deterministic, rule-based fallback classifier (`ruleBasedClassification`). If OpenAI fails or exceeds our 8-second timeout, the fallback classifier executes instantly based on error codes (e.g. `insufficient_funds`, `bank_decline`, `stolen_card`), logs `"AI unavailable, fallback used"` in the audit timeline, and successfully completes the recovery cadence without interruption.

---

### Challenge 5: Currency Conversion Double-Division Discrepancies
* **Root Cause:** In the predecessor project, payments were divided by 100 on insertion into MongoDB (storing ₹999 as `999`), but frontend presentation components divided the value by 100 again, rendering ₹999 as ₹10 (or ₹9.99).
* **Solution:** We established an inviolable architectural standard: **all monetary values are stored strictly in integer paise across all databases and backend models** (e.g. ₹999 is stored as `99900`). Currency conversion occurs solely at the UI presentation boundary via `fmtRupees = (paise) => '₹' + (paise / 100)`.
