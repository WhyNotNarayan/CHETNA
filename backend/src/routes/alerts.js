const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

const { protect, isAdmin } = require('../middleware/auth');

// Emergency SOS — trigger stays public (a safety app must never block
// an SOS because a token expired); response payload is sanitized server-side.
router.post('/trigger', alertController.triggerSOS);
router.post('/shake-alert', alertController.handleShakeAlert);

// Responder flow — must be a logged-in user; helperId is taken from the token.
router.post('/respond', protect, alertController.respondToSOS);

// Girl's own SOS screen — logged-in polling.
router.get('/stats/:alertId', protect, alertController.getSOSStats);
router.get('/nearby', protect, alertController.getNearbyAlerts);

// Live tracking + evidence — only the alert owner may write.
router.post('/:id/track', protect, alertController.trackSOS);
router.post('/:id/upload-evidence', protect, alertController.uploadEvidence);
router.post('/:id/upload-evidence-binary', protect, alertController.uploadEvidenceBinary);
router.post('/:id/upload-evidence-file', protect, alertController.uploadEvidenceFile);
router.get('/:id/verify-evidence', protect, alertController.verifyEvidenceFile);

router.post('/resolve', protect, alertController.resolveSOS);
router.get('/parent-notifications', protect, alertController.getParentNotifications);
router.get('/my-evidence', protect, alertController.getMyAlertsWithEvidence);

module.exports = router;
