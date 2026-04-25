const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

router.get('/latest', newsController.getLatestNews);
router.post('/add', newsController.addNews);

module.exports = router;
