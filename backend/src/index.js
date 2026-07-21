require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Apply JSON body parser only to NON-binary routes.
// Binary upload route uses req.pipe() — express.json() must NOT consume its stream.
app.use((req, res, next) => {
  if (req.path.includes('/upload-evidence-binary')) {
    return next(); // Skip JSON parsing for raw binary uploads
  }
  express.json({ limit: '50mb' })(req, res, next);
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'CHETNA API is running', timestamp: new Date() });
});

// Also provide health check under /api for the mobile app's offlineSync
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

// Import Routes
const authRoutes = require('./routes/auth');
const safetyRoutes = require('./routes/safety');
const alertRoutes = require('./routes/alerts');
const adminRoutes = require('./routes/admin');
const newsRoutes = require('./routes/news');
const evidenceRoutes = require('./routes/evidence');
const guardianRoutes = require('./routes/guardian');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/news', newsRoutes);
app.use('/evidence', evidenceRoutes);
app.use('/api/guardian', guardianRoutes);

// Start Guardian Timer cron job
const { startGuardianCron } = require('./services/guardianCron');
startGuardianCron();

app.listen(PORT, () => {
  console.log(`🚀 CHETNA Backend running on http://localhost:${PORT}`);
});
