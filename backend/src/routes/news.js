const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

const { protect, isAdmin } = require('../middleware/auth');

router.get('/latest', newsController.getLatestNews);
router.post('/add', protect, isAdmin, newsController.addNews);

module.exports = router;
