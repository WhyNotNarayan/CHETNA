const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// All routes here should theoretically be protected by an isAdmin middleware
// For now, we are building the functionality

router.post('/red-zones', adminController.addRedZone);
router.get('/red-zones', adminController.getRedZones);
router.delete('/red-zones/:id', adminController.deleteRedZone);
router.get('/analytics', adminController.getAnalytics);
router.get('/pending-secret-cops', adminController.getPendingSecretCops);
router.get('/verified-secret-cops', adminController.getVerifiedSecretCops);
router.get('/leaderboard', adminController.getLeaderboard);
router.post('/verify-secret-cop', adminController.verifySecretCop);

// Intel/Danger Road Reporting Management
router.get('/intel-requests', adminController.getIntelRequests);
router.post('/verify-intel', adminController.verifyIntel);

module.exports = router;
