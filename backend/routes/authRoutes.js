const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updateUser, deleteUser } = require('../controllers/authController');
const {protect} = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/profile', protect, updateUser);
router.delete('/profile', protect, deleteUser);


module.exports = router;