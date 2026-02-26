import React, { useState } from 'react'
import Modal from '../Modal'

const DeletePostModal = ({ isOpen, onClose, onConfirm, isLoading, isModerator = false }) => {
  const [deleteReason, setDeleteReason] = useState('')

  const handleConfirm = () => {
    if (isModerator && !deleteReason.trim()) {
      alert('Please provide a reason for deleting this post')
      return
    }
    onConfirm(deleteReason.trim() || null)
  }

  const handleClose = () => {
    setDeleteReason('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isModerator ? "Delete Post as Moderator" : "Delete Post"}
    >
      <div className="space-y-4">
        <p className="text-gray-300 text-sm">
          {isModerator 
            ? "Are you sure you want to delete this post as a moderator? This action cannot be undone."
            : "Are you sure you want to delete this post? This action cannot be undone."
          }
        </p>
        {isModerator && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for deletion (required)
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter the reason for deleting this post..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={4}
              disabled={isLoading}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || (isModerator && !deleteReason.trim())}
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeletePostModal
