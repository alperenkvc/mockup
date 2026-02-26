import React from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../Modal'
import { FaUser } from 'react-icons/fa'
import { HiUserGroup } from 'react-icons/hi'

const CollaboratorsModal = ({ isOpen, onClose, collaborators, owner }) => {
  const navigate = useNavigate()

  const handleUserClick = (username) => {
    navigate(`/user/${username}`)
    onClose()
  }

  // Combine owner and collaborators, with owner first
  const allUsers = owner ? [{ ...owner, isOwner: true }, ...(collaborators || [])] : (collaborators || [])

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Content Capsule Creators & Collaborators"
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {allUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No collaborators</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allUsers.map((user) => (
              <button
                key={user.id || user.user_id}
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
                    {user.isOwner ? (
                      <HiUserGroup className="text-gray-400" size={20} />
                    ) : (
                      <FaUser className="text-gray-400" size={20} />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm truncate">
                      {user.username}
                    </p>
                    {user.isOwner && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                        Owner
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default CollaboratorsModal
