import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TextInput from '../inputs/TextInput'
import CommunitySelect from '../inputs/CommunitySelect'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const MediaPostForm = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [communityId, setCommunityId] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files)
    handleFiles(selectedFiles)
  }

  const handleFiles = (fileList) => {
    const imageFiles = fileList.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
    setFiles(prev => [...prev, ...imageFiles])
  }

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (status) => {
    if (!isAuthenticated) {
      setError('Please login to create a post')
      return
    }

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (files.length === 0) {
      setError('Please select at least one image or video')
      return
    }

    // Backend only accepts single file, so we'll use the first file
    if (files.length > 1) {
      setError('Please select only one file')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('image', files[0]) // Backend expects 'image' field name
      if (communityId) {
        formData.append('community_id', communityId)
      }
      formData.append('status', status)

      const response = await api.createPost(formData, 'image')
      
      // Reset form
      setTitle('')
      setFiles([])
      setCommunityId('')
      
      // Navigate to home
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to create post')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDraft = () => {
    handleSubmit('draft')
  }

  const handlePost = () => {
    handleSubmit('published')
  }

  return (
    <div className="bg-transparent rounded-lg p-6 space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <CommunitySelect
        value={communityId}
        onChange={(e) => setCommunityId(e.target.value)}
      />
      <TextInput
        label="Title"
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={isLoading}
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Media</label>
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <p className="text-gray-400">
            Drag and drop or upload media
          </p>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800 rounded p-2">
                  <span className="text-sm text-gray-300 truncate flex-1">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile(index)
                    }}
                    className="ml-2 text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleDraft}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Draft'}
        </button>
        <button
          onClick={handlePost}
          disabled={isLoading}
          className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  )
}

export default MediaPostForm

