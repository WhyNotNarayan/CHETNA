const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const { protect } = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/admin-login', userController.adminLogin);
router.post('/verify-password', protect, userController.verifyPassword);
router.post('/apply-secret-cop', protect, userController.applySecretCop);
router.get('/profile/:id', protect, userController.getProfile);
router.post('/link-parent', protect, userController.linkParent);
router.post('/respond-link-request', protect, userController.respondLinkRequest);
router.post('/push-token', protect, userController.savePushToken);

module.exports = router;
