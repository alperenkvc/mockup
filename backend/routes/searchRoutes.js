const express = require('express');
const router = express.Router();
const { getGlobalResults } = require('../controllers/searchController');

router.get('/', getGlobalResults);

module.exports = router;