import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextInput from '../inputs/TextInput'
import CommunitySelect from '../inputs/CommunitySelect'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import { HiOutlinePlus, HiOutlineX } from 'react-icons/hi'

const PollPostForm = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [communityId, setCommunityId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOptionChange = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
    }
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

    const validOptions = options.filter(opt => opt.trim() !== '')
    if (validOptions.length < 2) {
      setError('Poll requires at least 2 options')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('poll_options', JSON.stringify(validOptions))
      if (communityId) {
        formData.append('community_id', communityId)
      }
      formData.append('status', status)

      const response = await api.createPost(formData, 'poll')
      
      // Reset form
      setTitle('')
      setOptions(['', ''])
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
        <label className="block text-sm font-medium text-gray-300 mb-2">Poll Options</label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <TextInput
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {options.length > 2 && (
                <button
                  onClick={() => handleRemoveOption(index)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Remove option"
                >
                  <HiOutlineX size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleAddOption}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-green-500 hover:text-green-400 font-medium transition-colors"
        >
          <HiOutlinePlus size={18} />
          Add option
        </button>
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

export default PollPostForm

