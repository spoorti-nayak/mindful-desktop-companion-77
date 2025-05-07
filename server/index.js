
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db/mongodb');
const authRoutes = require('./routes/auth');
const preferencesRoutes = require('./routes/preferences');
const { BlinkDetector } = require('./services/blink-detector');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
console.log('Connecting to MongoDB...');
connectDB().then(() => {
  console.log('MongoDB connection established successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferencesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Start server for API only mode
if (process.argv.includes('--api-only')) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
} else {
  // For Electron mode, we'll export the app
  module.exports = { app };
}

// Initialize Electron if not in API-only mode
if (!process.argv.includes('--api-only')) {
  require('./electron-main');
}
