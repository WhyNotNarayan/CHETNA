require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'CHETNA API is running', timestamp: new Date() });
});

// Import Routes
const authRoutes = require('./routes/auth');
const safetyRoutes = require('./routes/safety');
const alertRoutes = require('./routes/alerts');
const adminRoutes = require('./routes/admin');
const newsRoutes = require('./routes/news');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/news', newsRoutes);

app.listen(PORT, () => {
  console.log(`🚀 CHETNA Backend running on http://localhost:${PORT}`);
});
