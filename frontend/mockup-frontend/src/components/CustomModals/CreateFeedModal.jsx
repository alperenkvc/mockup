import React, { useState } from 'react'
import Modal from '../Modal'
import TextInput from '../inputs/TextInput'
import TextareaInput from '../inputs/TextareaInput'
import RadioInput from '../inputs/RadioInput'
import { api } from '../../utils/api'

const CreateFeedModal = ({ isOpen, onClose, onCreate }) => {
  const [feedName, setFeedName] = useState('')
  const [feedDescription, setFeedDescription] = useState('')
  const [isFeedPrivate, setIsFeedPrivate] = useState(false)
  const [collabOption, setCollabOption] = useState('none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setFeedName('')
    setFeedDescription('')
    setIsFeedPrivate(false)
    setCollabOption('none')
    setError('')
    setIsLoading(false)
    onClose()
  }

  const handleCreate = async () => {
    if (!feedName.trim()) {
      setError('Content capsule name is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const feedData = {
        name: feedName.trim(),
        description: feedDescription.trim() || null,
        isPrivate: isFeedPrivate,
        collabOption: collabOption
      }

      const createdFeed = await api.createFeed(feedData)
      
      if (onCreate) {
        onCreate(createdFeed)
      }
      
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to create content capsule')
      setIsLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create a content capsule"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <TextInput
            label="Name"
            value={feedName}
            onChange={(e) => {
              setFeedName(e.target.value)
              setError('')
            }}
            placeholder="Content capsule name"
            type="text"
            id="feed-name"
            required
          />
        </div>

        <div>
          <TextareaInput
            label="Description"
            value={feedDescription}
            onChange={(e) => setFeedDescription(e.target.value)}
            placeholder="Content capsule description (optional)"
            id="feed-description"
          />
        </div>

        {/* Collaboration Options */}
        <div className="pt-2 border-t border-gray-700">
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Collaboration Options
          </label>
          <div className="space-y-2">
            <RadioInput
              label="No collaboration - Only you can modify this content capsule"
              name="collabOption"
              value="none"
              checked={collabOption === 'none'}
              onChange={(e) => setCollabOption(e.target.value)}
            />
            <RadioInput
              label="Free collaboration - Anyone can join and modify"
              name="collabOption"
              value="free"
              checked={collabOption === 'free'}
              onChange={(e) => setCollabOption(e.target.value)}
            />
            <RadioInput
              label="Approval required - Users must request to collaborate"
              name="collabOption"
              value="approval"
              checked={collabOption === 'approval'}
              onChange={(e) => setCollabOption(e.target.value)}
            />
          </div>
        </div>

        {/* Toggle Switches */}
        <div className="pt-2 border-t border-gray-700">
          {/* Private Feed Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label htmlFor="feed-private" className="text-sm font-medium text-gray-300">
                Make feed private
              </label>
              <p className="text-xs text-gray-500 mt-1">Only you can see this content capsule</p>
            </div>
            <button
              type="button"
              id="feed-private"
              onClick={() => setIsFeedPrivate(!isFeedPrivate)}
              className={`toggle-switch ${isFeedPrivate ? 'active' : ''}`}
            >
              <span className="toggle-switch-thumb" />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || !feedName.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Content Capsule'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateFeedModal

