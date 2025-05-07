
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use the environment variable or fall back to a default local MongoDB URI
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attentionPlease';
    
    console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
