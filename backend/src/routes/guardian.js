const express = require('express');
const router = express.Router();
const guardianController = require('../controllers/guardianController');
const { protect } = require('../middleware/auth');

router.post('/start', protect, guardianController.startSession);
router.post('/complete', protect, guardianController.completeSession);
router.get('/active', protect, guardianController.getActiveSessions);

module.exports = router;
