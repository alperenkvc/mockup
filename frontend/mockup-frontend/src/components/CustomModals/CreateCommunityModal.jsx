import React, { useState } from 'react'
import Modal from '../Modal'
import TextInput from '../inputs/TextInput'
import TextareaInput from '../inputs/TextareaInput'
import RadioInput from '../inputs/RadioInput'
import { api } from '../../utils/api'

const CreateCommunityModal = ({ isOpen, onClose, onCreate }) => {
  const [communityName, setCommunityName] = useState('')
  const [description, setDescription] = useState('')
  const [communityType, setCommunityType] = useState('public')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setCommunityName('')
    setDescription('')
    setCommunityType('public')
    setError('')
    onClose()
  }

  const handleCreate = async () => {
    if (!communityName.trim()) {
      setError('Group name is required')
      return
    }

    if (!description.trim()) {
      setError('Description is required')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('community_name', communityName.trim())
      formData.append('description', description.trim())
      formData.append('type', communityType)

      const response = await api.createCommunity(formData)
      
      if (onCreate) {
        onCreate(response)
      }
      
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create a group"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div>
          <TextInput
            label="Name"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="Group name"
            type="text"
            id="community-name"
            required
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-400">
            Group names including capitalization cannot be changed.
          </p>
        </div>

        <div>
          <TextareaInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your group"
            rows={4}
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="community-type" className="block text-sm font-medium text-gray-300 mb-2">
            Group type
          </label>
          <div className="space-y-2">
            <RadioInput
              label="Public"
              name="community-type"
              value="public"
              checked={communityType === 'public'}
              onChange={(e) => setCommunityType(e.target.value)}
            />
            <RadioInput
              label="Private"
              name="community-type"
              value="private"
              checked={communityType === 'private'}
              onChange={(e) => setCommunityType(e.target.value)}
            />
            <RadioInput
              label="Restricted"
              name="community-type"
              value="restricted"
              checked={communityType === 'restricted'}
              onChange={(e) => setCommunityType(e.target.value)}
            />
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
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateCommunityModal

