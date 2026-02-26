import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextInput from '../inputs/TextInput'
import TextareaInput from '../inputs/TextareaInput'
import CommunitySelect from '../inputs/CommunitySelect'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const TextPostForm = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (status) => {
    if (!isAuthenticated) {
      setError('Please login to create a post')
      return
    }

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      if (body.trim()) {
        formData.append('body_text', body)
      }
      if (communityId) {
        formData.append('community_id', communityId)
      }
      formData.append('status', status)

      const response = await api.createPost(formData, 'text')
      
      // Reset form
      setTitle('')
      setBody('')
      setCommunityId('')
      
      // Navigate to home or the post
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
      <TextareaInput
        label="Body Text"
        placeholder="Post body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        disabled={isLoading}
      />
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

export default TextPostForm

