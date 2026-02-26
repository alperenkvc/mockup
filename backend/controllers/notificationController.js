const Notification = require('../models/Notification');

/**
 * @desc    Get notifications for authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user.id;
    
    const notifications = await Notification.findByUserId(userId, limit);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

/**
 * @desc    Get unread notification count for authenticated user
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);
    
    res.json({ count });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }
    
    const notification = await Notification.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
};

/**
 * @desc    Mark all notifications as read for authenticated user
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = require('../config/db');
    
    const query = `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE recipient_id = $1 AND is_read = FALSE
      RETURNING *;
    `;
    
    const { rows } = await db.query(query, [userId]);
    
    res.json({ 
      message: 'All notifications marked as read',
      count: rows.length 
    });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({ message: 'Server error while marking all notifications as read' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead
};
