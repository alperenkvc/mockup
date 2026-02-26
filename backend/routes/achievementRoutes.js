const express = require('express');
const router = express.Router();
const { getAllAchievements } = require('../controllers/achievementController');

// This is a public route—anyone can see what badges are available
router.get('/', getAllAchievements);

module.exports = router;