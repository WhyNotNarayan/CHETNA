const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.post('/trigger', alertController.triggerSOS);
router.post('/respond', alertController.respondToSOS);
router.get('/nearby', alertController.getNearbyAlerts);

module.exports = router;
