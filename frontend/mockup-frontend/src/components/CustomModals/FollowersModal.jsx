import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../Modal'
import { FaUser } from 'react-icons/fa'
import { api } from '../../utils/api'
import { formatDistanceToNow } from 'date-fns'

const FollowersModal = ({ isOpen, onClose, userId, type = 'followers' }) => {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      setError('')
      const data = type === 'followers' 
        ? await api.getFollowers(userId)
        : await api.getFollowing(userId)
      setUsers(data || [])
    } catch (err) {
      setError(err.message || `Failed to load ${type}`)
      console.error(`Error fetching ${type}:`, err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers()
    } else {
      // Reset state when modal closes
      setUsers([])
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId, type])

  const handleUserClick = (username) => {
    navigate(`/user/${username}`)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={type === 'followers' ? 'Followers' : 'Following'}
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No {type} yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user.username)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
              >
                {user.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-400" size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {user.username}
                  </p>
                  {user.followed_at && (
                    <p className="text-gray-400 text-xs">
                      {type === 'followers' 
                        ? `Following since ${formatDistanceToNow(new Date(user.followed_at), { addSuffix: true })}`
                        : `Followed ${formatDistanceToNow(new Date(user.followed_at), { addSuffix: true })}`
                      }
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default FollowersModal
