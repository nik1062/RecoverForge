# RecoverForge — Production Deployment Guide
**Target Infrastructure:** AWS EC2 (Ubuntu 22.04 LTS), Nginx Reverse Proxy, PM2 Process Manager, Let's Encrypt SSL.

---

## 1. Prerequisites & Server Scaffolding

Connect to your AWS EC2 instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-ip-or-domain>
```

Update system packages and install required runtimes (Node.js 18 LTS, Nginx, Certbot):
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # Should be v18.x
npm -v    # Should be v9.x or v10.x

# Install PM2 globally
sudo npm install -g pm2
```

---

## 2. Clone Repository & Setup Environment

Clone into your home directory:
```bash
cd ~
git clone https://github.com/nik1062/RecoverForge.git
cd RecoverForge
```

Create production `.env` for the backend:
```bash
cp .env.example backend/.env
nano backend/.env
```
Fill in your production values:
* `PORT=5000`
* `NODE_ENV=production`
* `FRONTEND_URL=https://<your-domain.com>`
* `MONGODB_URI=mongodb+srv://...`
* `JWT_SECRET=<generate-a-strong-random-secret>`
* `RAZORPAY_KEY_ID=<your-rzp-key-id>`
* `RAZORPAY_KEY_SECRET=<your-rzp-key-secret>`
* `RAZORPAY_WEBHOOK_SECRET=<your-chosen-webhook-secret>`
* `OPENAI_API_KEY=<your-openai-api-key>`
* `RESEND_API_KEY=<your-resend-api-key>`

---

## 3. Install Dependencies & Build Frontend

```bash
# Backend Installation
cd ~/RecoverForge/backend
npm ci --production

# Frontend Build
cd ~/RecoverForge/frontend
npm ci
npm run build
```
Verify `frontend/dist` directory exists:
```bash
ls -la ~/RecoverForge/frontend/dist
```

---

## 4. PM2 Process Manager Setup

Start the backend process and configure it to survive server reboots:
```bash
cd ~/RecoverForge/backend

# Start backend service
pm2 start server.js --name "recoverforge-backend"

# Configure PM2 systemd startup hook
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save the active PM2 process list
pm2 save

# Verify status
pm2 status
pm2 logs recoverforge-backend --lines 20
```

---

## 5. Nginx Reverse Proxy Configuration

Create the Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/recoverforge
```

Paste the following configuration (replace `<your-domain.com>` with your actual domain):

```nginx
server {
    server_name <your-domain.com>;

    # Sensible request limits
    client_max_body_size 10M;

    # 1. Serve React Frontend Static Assets
    root /home/ubuntu/RecoverForge/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Raw Webhook Stream for Razorpay HMAC Signature Verification
    # CRITICAL: Preserve uncompressed, unbuffered body stream
    location /webhooks/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # Disable body buffer & gzip alteration for exact cryptographic match
        proxy_buffering off;
        proxy_request_buffering off;
        gzip off;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Pass Razorpay signature headers intact
        proxy_set_header X-Razorpay-Signature $http_x_razorpay_signature;
        proxy_set_header X-Razorpay-Event-Id $http_x_razorpay_event_id;
    }

    # 3. Proxy API Routes
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Proxy Opt-out & Health Endpoints
    location /optout/ {
        proxy_pass http://127.0.0.1:5000/optout/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
    }
}
```

Enable the site configuration and test syntax:
```bash
sudo ln -s /etc/nginx/sites-available/recoverforge /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL / HTTPS Setup via Certbot (Let's Encrypt)

Obtain and configure automatic SSL certificates:
```bash
sudo certbot --nginx -d <your-domain.com>
```

Verify certificate auto-renewal dry run:
```bash
sudo certbot renew --dry-run
```

---

## 7. Razorpay Dashboard Webhook Configuration

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/) (Switch to **Test Mode**).
2. Navigate to **Settings** > **Webhooks** > Click **Add New Webhook**.
3. Set **Webhook URL**:
   `https://<your-domain.com>/webhooks/razorpay`
4. Set **Secret**:
   Enter a secure random string (e.g. `whsec_98f12a...`). Copy this exact string into `RAZORPAY_WEBHOOK_SECRET` in your server's `backend/.env`.
5. Select the following **Active Events**:
   - `payment.failed` (Triggers recovery pipeline on checkout drop/decline)
   - `payment_link.paid` (Halts follow-up sequence when buyer settles link)
   - `payment.captured` (Halts follow-up if buyer pays merchant directly)
   - `payment_link.expired` (Handles link expiration decisions)
6. Click **Create Webhook**.

---

## 8. Post-Deployment Smoke Test

Execute the automated smoke verification script:
```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh https://<your-domain.com>
```
Expected output:
```
• Testing GET /health ... PASS (HTTP 200)
• Testing POST /webhooks/razorpay with INVALID signature ... PASS (Correctly rejected with HTTP 400)
• Testing POST /webhooks/razorpay with VALID HMAC-SHA256 signature ... PASS (Accepted with HTTP 200)
• Testing Replay Idempotency with duplicate X-Razorpay-Event-Id ... PASS (Idempotency confirmed: ignored_duplicate)
✅ ALL SMOKE TESTS PASSED CLEANLY!
```
