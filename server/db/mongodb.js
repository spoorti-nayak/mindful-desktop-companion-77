
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use the environment variable or fall back to a default local MongoDB URI
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attentionPlease';
    
    console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);
    
    const conn = await mongoose.connect(mongoUri, {
      // Removed deprecated options
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit process on connection error, just log it
    // This allows the app to continue functioning with mock data
    console.log('Application will continue with mock data');
    return null;
  }
};

module.exports = { connectDB };
