const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

const { protect, isAdmin } = require('../middleware/auth');

// Red zones: read is needed by girls'/boys' AI Navigator; write is admin console
// (also reachable from the Secret Cop map screen — requires a logged-in user).
router.get('/red-zones', protect, adminController.getRedZones);
router.post('/red-zones', protect, adminController.addRedZone);
router.delete('/red-zones/:id', protect, adminController.deleteRedZone);

// Used by Secret Cop dashboard (leaderboard / radar)
router.get('/leaderboard', protect, adminController.getLeaderboard);
router.get('/verified-secret-cops', protect, adminController.getVerifiedSecretCops);

// Strictly admin console — require ADMIN role
router.get('/analytics', protect, isAdmin, adminController.getAnalytics);
router.get('/pending-secret-cops', protect, isAdmin, adminController.getPendingSecretCops);
router.post('/verify-secret-cop', protect, isAdmin, adminController.verifySecretCop);

// Intel/Danger Road Reporting Management
router.get('/intel-requests', protect, isAdmin, adminController.getIntelRequests);
router.post('/verify-intel', protect, isAdmin, adminController.verifyIntel);

module.exports = router;
