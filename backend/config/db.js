const mongoose = require('mongoose');

const connectDB = async () => {
  // In test environment without explicit MONGODB_URI, skip live DB connection
  if (process.env.NODE_ENV === 'test' && !process.env.MONGODB_URI) {
    return;
  }

  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.error('FATAL: MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    // Obfuscate credentials for safe logging
    const safeHost = uri.replace(/\/\/.*@/, '//****:****@');
    console.log(`Connecting to database: ${safeHost}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
