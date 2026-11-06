/**
 * Script to bootstrap or promote an admin merchant account
 * Usage:
 *   ADMIN_EMAIL="admin@yourdomain.com" ADMIN_PASSWORD="your-secure-password" node scripts/createAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'RecoverForge Operator';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be provided via environment variables.');
  process.exit(1);
}

async function createAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is required to run createAdmin.');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);

    let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });
    if (admin) {
      admin.isAdmin = true;
      admin.isVerified = true;
      await admin.save();
      console.log(`User ${ADMIN_EMAIL} promoted to admin.`);
    } else {
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase().trim(),
        password: ADMIN_PASSWORD,
        isAdmin: true,
        isVerified: true,
        plan: 'premium'
      });
      console.log(`Admin user successfully created for: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Failed to create admin:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
