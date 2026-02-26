import React from 'react'
import ConfirmModal from './ConfirmModal'

const BanUserModal = ({ isOpen, onClose, onConfirm, username, isLoading }) => {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ban ${username}`}
      message={`Are you sure you want to ban ${username} from this group?`}
      confirmText="Ban User"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      isLoading={isLoading}
      confirmButtonClass="bg-red-600 hover:bg-red-700"
    />
  )
}

export default BanUserModal
