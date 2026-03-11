import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiBell, HiCheck } from 'react-icons/hi'
import { formatDistanceToNow } from 'date-fns'
import { io } from 'socket.io-client'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const NotificationBox = ({ isInSideMenu = false }) => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const notificationRef = useRef(null)
  const socketRef = useRef(null)

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      const [notifs, count] = await Promise.all([
        api.getNotifications(20),
        api.getUnreadCount()
      ])
      setNotifications(notifs || [])
      setUnreadCount(count?.count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications()

      const token = localStorage.getItem('token')
      if (!token) return

      // Set up socket.io connection for real-time notifications (authenticated via JWT)
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      })

      socketRef.current = socket

      socket.on('connect', () => {
        console.log('Socket connected for notifications')
      })

      socket.on('new_notification', (notificationData) => {
        // Normalize notification data to ensure it has the expected fields
        const normalizedNotification = {
          ...notificationData,
          id: notificationData.notification_id || notificationData.id,
          created_at: notificationData.created_at || new Date().toISOString()
        }
        // Add new notification to the list
        setNotifications(prev => [normalizedNotification, ...prev])
        setUnreadCount(prev => prev + 1)
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      return () => {
        socket.disconnect()
      }
    }
  }, [isAuthenticated, user?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.markNotificationAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate based on notification type
    if (notification.type === 'COMMENT' || notification.type === 'REPLY') {
      navigate(`/post/${notification.entity_id}`)
    } else if (notification.type === 'USER_FOLLOWED') {
      navigate(`/user/${notification.sender_username}`)
    } else if (notification.type === 'MEMBER_JOINED' || notification.type === 'MEMBERSHIP_APPROVED' || notification.type === 'MODERATOR_PROMOTED') {
      // Use community_name if available, otherwise fetch it
      if (notification.community_name) {
        navigate(`/r/${encodeURIComponent(notification.community_name)}`)
      } else {
        // This shouldn't happen if backend is working correctly
        navigate(`/r/${notification.entity_id}`)
      }
    } else if (notification.type === 'COLLABORATOR_JOINED' || notification.type === 'COLLABORATION_REQUEST' || notification.type === 'FEED_LIKED') {
      navigate(`/feed/${notification.entity_id}`)
    }

    setIsOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationMessage = (notification) => {
    const sender = notification.sender_username || 'Someone'
    
    switch (notification.type) {
      case 'COMMENT':
        return `${sender} commented on your post`
      case 'REPLY':
        return `${sender} replied to your comment`
      case 'USER_FOLLOWED':
        return `${sender} started following you`
      case 'MEMBER_JOINED':
        return `${sender} joined the community`
      case 'MEMBERSHIP_APPROVED':
        return `Your membership request was approved`
      case 'MODERATOR_PROMOTED':
        return `You were promoted to moderator`
      case 'COLLABORATOR_JOINED':
        return `${sender} joined as a collaborator`
      case 'COLLABORATION_REQUEST':
        return `${sender} requested to collaborate`
      case 'FEED_LIKED':
        return `${sender} liked your feed`
      default:
        return 'New notification'
    }
  }

  if (!isAuthenticated) return null

  const handleToggleDropdown = () => {
    if (!isOpen) {
      // Refresh notifications when opening dropdown
      fetchNotifications()
    }
    setIsOpen(!isOpen)
  }

  if (isInSideMenu) {
    return (
      <div className="relative w-full" ref={notificationRef}>
        <button
          onClick={handleToggleDropdown}
          className="flex items-center gap-4 w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white relative"
        >
          <HiBell size={20} className="flex-shrink-0" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setIsOpen(false)}>
            <div 
              className="absolute top-0 right-0 h-full w-[85vw] max-w-sm bg-gray-800 border-l border-gray-700 shadow-lg flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-green-500 hover:text-green-400 flex items-center gap-1"
                    >
                      <HiCheck size={16} />
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-4 hover:bg-gray-900 transition-colors text-left ${
                          !notification.is_read ? 'bg-gray-900/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {notification.sender_avatar ? (
                            <img
                              src={notification.sender_avatar}
                              alt={notification.sender_username || 'User'}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-400 text-sm">
                                {notification.sender_username?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">
                              {getNotificationMessage(notification)}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={handleToggleDropdown}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
      >
        <HiBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-[500px] flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-green-500 hover:text-green-400 flex items-center gap-1"
              >
                <HiCheck size={16} />
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 hover:bg-gray-900 transition-colors text-left ${
                      !notification.is_read ? 'bg-gray-900/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.sender_avatar ? (
                        <img
                          src={notification.sender_avatar}
                          alt={notification.sender_username || 'User'}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-sm">
                            {notification.sender_username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBox
