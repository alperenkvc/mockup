import React, { useState, useEffect } from 'react'
import { api } from '../../utils/api'

const CommunitySelect = ({ value, onChange, label = "Group", required = false }) => {
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true)
        const data = await api.getAllCommunities()
        setCommunities(data || [])
      } catch (err) {
        setError('Failed to load groups')
        console.error('Error fetching communities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [])

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        value={value || ''}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        disabled={loading}
      >
        <option value="">Select a group (optional)</option>
        {communities.map((community) => (
          <option key={community.id} value={community.id}>
            {community.community_name}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      {loading && (
        <p className="mt-1 text-sm text-gray-400">Loading groups...</p>
      )}
    </div>
  )
}

export default CommunitySelect
