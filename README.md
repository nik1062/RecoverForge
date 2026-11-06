#Hii welcome 🤗 🙂 
# MailForge ⚡ — AI Cold Email SaaS

> **Write cold emails that actually get replies.** MailForge uses GPT-4o to generate hyper-personalized cold emails and follow-up sequences in seconds.

---

## What Problem Does It Solve?

Most B2B salespeople and founders send generic, template-based cold emails that get ignored. MailForge solves this by:

- **Personalization at scale** — Input your prospect's pain points, company, and your offer; get a perfectly tailored email
- **AI-powered copywriting** — GPT-4o writes emails that sound human, not like a bot
- **Follow-up sequences** — Auto-generate 3-part follow-up sequences (Day 3, Day 7, Day 14)
- **Credit system** — Pay-as-you-go with Razorpay; 50 free credits on signup
- **Email history** — All generated emails saved for review, copy, and reuse
- **Admin Dashboard** — Full platform management for operators

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS      |
| Backend   | Node.js + Express                   |
| Database  | MongoDB + Mongoose                  |
| Auth      | JWT + OTP email verification        |
| AI        | OpenAI GPT-4o-mini                  |
| Payments  | Razorpay                            |
| Email     | Nodemailer (Gmail SMTP)             |
| Deploy    | Docker + Docker Compose             |

---

## Features

### User Features
- Signup with email OTP verification
- Login / logout with JWT
- Dashboard with credit usage stats
- Generate cold emails (costs 5 credits)
- Generate 3-part follow-up sequences (costs 3 credits)
- Email history with search and delete
- One-click copy to clipboard
- Billing page with Razorpay integration
- Profile settings

### Admin Dashboard (`/admin`)
- Platform overview — total users, emails, revenue stats
- User management — search, filter, verify, ban, change plan, add credits
- Email logs — view all generated emails across the platform
- Transaction history — all payments with status

---

## Bugs Fixed in This Version

| # | Bug | Fix |
|---|-----|-----|
| 1 | `Cannot find module '../utils/generateToken'` | Created `backend/utils/generateToken.js` |
| 2 | Frontend "No matching export" errors | Added named + default exports to `api.js` |
| 3 | Port 5000 conflict | Changed to port **5001** in `.env` and `vite.config.js` |
| 4 | OTP page used `loginUser` (undefined) | Changed to `login` — the correct AuthContext export |
| 5 | Dashboard read `res.data.emails` | Fixed to `res.data.data` to match API response |
| 6 | GeneratePage read `res.data.email` | Fixed to `res.data.data` |
| 7 | Routes `/verify-otp` vs `/verify` mismatch | Added both routes in `App.jsx` |
| 8 | Email route mismatch `/api/email` vs `/api/emails` | Standardized to `/api/emails` everywhere |
| 9 | No admin user system | Added `isAdmin`, `isBanned` to User model + admin middleware + admin routes |
| 10 | MongoDB not running | Instructions below — MongoDB Atlas recommended |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key
- Gmail account with App Password

### Option A — Docker (Recommended)

```bash
git clone <your-repo>
cd mailforge

# Edit backend/.env with your keys (copy from .env.example)
cp backend/.env backend/.env.local

# Start everything
docker-compose up -d

# Create admin user
docker exec mailforge_backend node scripts/createAdmin.js
```

### Option B — Local Setup

#### 1. Start MongoDB

**MongoDB Atlas (easiest):**
1. Go to mongodb.com/atlas and create a free cluster
2. Copy your connection URI  
3. Set `MONGODB_URI=mongodb+srv://...` in `backend/.env`

**Local MongoDB:**
```bash
# macOS
brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Windows: Start MongoDB from Services panel
```

#### 2. Backend Setup

```bash
cd backend
npm install
# Edit .env with your credentials
npm run dev   # Starts on port 5001
```

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev   # Starts on port 5173
```

#### 4. Create Admin User

```bash
cd backend
node scripts/createAdmin.js
```

Default admin credentials:
- Email: `admin@mailforge.com`
- Password: `Admin@123456`

Admin panel: **http://localhost:5173/admin**

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mailforge

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=MailForge <your-email@gmail.com>

# OpenAI
OPENAI_API_KEY=sk-...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret

# CORS
FRONTEND_URL=http://localhost:5173
```

### Gmail App Password
1. Enable 2FA on your Google account
2. Go to Google Account > Security > App Passwords
3. Create an App Password for "Mail"
4. Use the 16-character code as `SMTP_PASS`

---

## Project Structure

```
mailforge/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── emailController.js
│   │   ├── paymentController.js
│   │   └── adminController.js     ← NEW
│   ├── middleware/
│   │   ├── auth.js                ← Updated with adminOnly
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js                ← Updated with isAdmin, isBanned
│   │   ├── EmailHistory.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── email.js
│   │   ├── payment.js
│   │   └── admin.js               ← NEW
│   ├── utils/
│   │   ├── generateToken.js       ← NEW (was missing)
│   │   ├── generateOTP.js
│   │   └── sendEmail.js
│   ├── scripts/
│   │   └── createAdmin.js         ← NEW
│   ├── .env
│   └── server.js                  ← Updated with /api/admin route
│
├── frontend/src/
│   ├── pages/
│   │   ├── AdminPage.jsx          ← NEW (4 tabs: Overview, Users, Emails, Txns)
│   │   └── ... (all other pages fixed)
│   ├── services/
│   │   └── api.js                 ← Fixed exports + adminAPI added
│   └── App.jsx                    ← Fixed routes + admin route added
│
└── docker-compose.yml
```

---

## API Reference

### Auth (`/api/auth`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/signup` | No | Register + send OTP |
| POST | `/verify-otp` | No | Verify OTP, get JWT |
| POST | `/resend-otp` | No | Resend OTP |
| POST | `/login` | No | Login, get JWT |
| GET | `/me` | JWT | Get current user |
| PUT | `/profile` | JWT | Update profile |

### Emails (`/api/emails`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/generate` | Generate cold email (5 credits) |
| POST | `/generate-followup` | Generate follow-ups (3 credits) |
| GET | `/history` | Paginated email history |
| DELETE | `/history/:id` | Delete email |

### Admin (`/api/admin` — admin only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/stats` | Platform overview stats |
| GET | `/users` | All users with filtering |
| PUT | `/users/:id` | Update user (verify/ban/plan/credits) |
| GET | `/emails` | All generated emails |
| GET | `/transactions` | All payment transactions |
