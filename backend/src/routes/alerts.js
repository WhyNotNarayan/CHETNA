const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

const { protect } = require('../middleware/auth');

router.post('/trigger', alertController.triggerSOS);
router.post('/respond', alertController.respondToSOS);
router.post('/resolve', protect, alertController.resolveSOS);
router.get('/stats/:alertId', alertController.getSOSStats);
router.get('/nearby', alertController.getNearbyAlerts);
router.post('/:id/track', alertController.trackSOS);
router.post('/:id/upload-evidence', alertController.uploadEvidence);
router.post('/:id/upload-evidence-binary', alertController.uploadEvidenceBinary);
router.get('/:id/verify-evidence', alertController.verifyEvidenceFile);
router.post('/:id/upload-evidence-file', alertController.uploadEvidenceFile);
router.get('/parent-notifications', protect, alertController.getParentNotifications);
router.get('/my-evidence', protect, alertController.getMyAlertsWithEvidence);
router.get('/:id/evidence', protect, alertController.getAlertEvidence);

module.exports = router;
