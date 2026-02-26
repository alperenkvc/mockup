const express = require('express');
const router = express.Router();
const { getNotifications, getUnreadCount, markNotificationAsRead, markAllAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/:id/read', protect, markNotificationAsRead);
router.patch('/mark-all-read', protect, markAllAsRead);

module.exports = router;
