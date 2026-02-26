import React from 'react'
import Modal from '../Modal'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmButtonClass = 'bg-green-500 hover:bg-green-600', isLoading = false }) => {
  const handleConfirm = () => {
    onConfirm()
    // Don't close if loading - let the parent handle closing after success
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'}>
      <div className="space-y-4">
        <p className="text-gray-300">{message}</p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 ${confirmButtonClass} text-white font-semibold rounded-full transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal
