import React, { useState, useRef } from 'react'
import Modal from '../Modal'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const UpdatePictureModal = ({ isOpen, onClose, type = 'user', communityId = null, onSuccess }) => {
  const { user, updateUser } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB')
        return
      }
      setSelectedFile(file)
      setError('')
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select an image file')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      const fieldName = type === 'user' ? 'profile_picture_url' : 'community_picture_url'
      formData.append(fieldName, selectedFile)

      let response
      if (type === 'user') {
        response = await api.updateProfilePicture(formData)
        // Update user context
        if (updateUser && response.profile_picture_url) {
          updateUser({ ...user, profile_picture_url: response.profile_picture_url })
        }
      } else {
        response = await api.updateCommunityPicture(communityId, formData)
      }

      // Reset form
      setSelectedFile(null)
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      if (onSuccess) {
        onSuccess(response)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update picture')
      console.error('Error updating picture:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreview(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Update ${type === 'user' ? 'Profile' : 'Group'} Picture`}
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className={`${type === 'user' ? 'w-32 h-32' : 'w-40 h-40'} rounded-full object-cover border-2 border-gray-700`}
              />
              <button
                onClick={handleRemoveFile}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Image
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600"
          />
          <p className="text-xs text-gray-400 mt-1">
            Maximum file size: 5MB. Supported formats: JPG, PNG
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Update Picture'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default UpdatePictureModal
