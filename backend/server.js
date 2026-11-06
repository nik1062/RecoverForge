require('dotenv').config();
const dns = require('dns');
// Fix for SRV lookup errors on some networks
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Security Baseline: Refuse to start if critical JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing. Server cannot start securely.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// Security Headers
app.use(helmet());

// Strict CORS: Allow only configured FRONTEND_URL and local dev ports
const allowedOrigins = [
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server webhooks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature', 'X-Razorpay-Event-Id']
}));

// Standard JSON parser for non-webhook routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'RecoverForge API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'RecoverForge API is active' });
});

// Route modules
app.use('/auth', require('./routes/auth'));
app.use('/payments', require('./routes/payment'));
app.use('/admin', require('./routes/admin'));

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 RecoverForge server running on port ${PORT}`);
  });
}

module.exports = app;
