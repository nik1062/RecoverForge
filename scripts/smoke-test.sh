#!/usr/bin/env bash
# ==============================================================================
# RecoverForge Production Smoke Test Suite
# Validates: Health Check, Webhook HMAC Verification, Idempotency, and Processing
# ==============================================================================

set -eo pipefail

HOST="${1:-http://localhost:5000}"
WEBHOOK_SECRET="${RAZORPAY_WEBHOOK_SECRET:-test_webhook_secret_key_7890}"

echo "=========================================================="
echo "🚀 Running RecoverForge Smoke Tests against: ${HOST}"
echo "=========================================================="

# 1. Health check returns 200
echo -n "• Testing GET /health ... "
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${HOST}/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "PASS (HTTP 200)"
else
  echo "FAIL (HTTP ${HTTP_CODE})"
  echo "Body: ${BODY}"
  exit 1
fi

# 2. Webhook with bad signature returns 400
echo -n "• Testing POST /webhooks/razorpay with INVALID signature ... "
BAD_SIG_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${HOST}/webhooks/razorpay" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: fake_bad_signature_hash" \
  -H "X-Razorpay-Event-Id: evt_smoke_bad_sig" \
  -d '{"event":"payment.failed","payload":{}}')

HTTP_CODE=$(echo "$BAD_SIG_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 400 ]; then
  echo "PASS (Correctly rejected with HTTP 400)"
else
  echo "FAIL (Expected HTTP 400, got ${HTTP_CODE})"
  exit 1
fi

# 3. Webhook with valid signature returns 200
echo -n "• Testing POST /webhooks/razorpay with VALID HMAC-SHA256 signature ... "
EVENT_ID="evt_smoke_$(date +%s)"
PAYLOAD='{"event":"payment.failed","payload":{"payment":{"entity":{"id":"pay_smoke_'$(date +%s)'","amount":199900,"currency":"INR","email":"smoke.buyer@test.io","error_code":"BAD_REQUEST_ERROR","error_reason":"insufficient_funds","method":"card"}}}}'

# Calculate HMAC-SHA256 signature using openssl
VALID_SIGNATURE=$(printf "%s" "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

VALID_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${HOST}/webhooks/razorpay" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: ${VALID_SIGNATURE}" \
  -H "X-Razorpay-Event-Id: ${EVENT_ID}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$VALID_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "PASS (Accepted with HTTP 200)"
else
  echo "FAIL (Expected HTTP 200, got ${HTTP_CODE})"
  exit 1
fi

# 4. Replaying the same event ID returns 200 with idempotent status
echo -n "• Testing Replay Idempotency with duplicate X-Razorpay-Event-Id ... "
REPLAY_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${HOST}/webhooks/razorpay" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: ${VALID_SIGNATURE}" \
  -H "X-Razorpay-Event-Id: ${EVENT_ID}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$REPLAY_RESPONSE" | tail -n1)
REPLAY_BODY=$(echo "$REPLAY_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] && echo "$REPLAY_BODY" | grep -q "ignored_duplicate"; then
  echo "PASS (Idempotency confirmed: ignored_duplicate)"
else
  echo "FAIL (Expected ignored_duplicate, got ${REPLAY_BODY})"
  exit 1
fi

echo "=========================================================="
echo "✅ ALL SMOKE TESTS PASSED CLEANLY!"
echo "=========================================================="
