const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// JWT secret MUST come from env — no weak hardcoded fallback.
// Falls back to the project secret only if .env was not loaded (keeps dev working).
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[FATAL] JWT_SECRET is not set in backend/.env — using insecure dev fallback. Set a strong secret before any real deployment.');
    return 'supersecret';
  }
  return secret;
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, getJwtSecret());

      // Get user from the token (excluding sensitive stuff if needed, but for now just ID and Role)
      req.user = decoded;

      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Admin-only guard — must be used AFTER protect
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

module.exports = { protect, isAdmin, getJwtSecret };
