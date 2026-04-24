const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/send-otp', userController.sendOTP);
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/admin-login', userController.adminLogin);

module.exports = router;
