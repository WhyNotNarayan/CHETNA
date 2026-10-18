const express = require('express');
const router = express.Router();
const copLinkController = require('../controllers/copLinkController');

const { protect } = require('../middleware/auth');

router.get('/my-links', protect, copLinkController.getMyLinks);
router.post('/request', protect, copLinkController.requestLink);
router.get('/requests', protect, copLinkController.getRequests);
router.post('/respond', protect, copLinkController.respondToRequest);

module.exports = router;
