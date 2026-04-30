const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const { protect } = require('../middleware/auth');

router.post('/send-otp', userController.sendOTP);
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/admin-login', userController.adminLogin);
router.post('/apply-secret-cop', protect, userController.applySecretCop);

module.exports = router;
