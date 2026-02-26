import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CommunityCard from '../../components/Cards/CommunityCard'
import ConfirmModal from '../../components/CustomModals/ConfirmModal'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const ManageCommunities = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leavingId, setLeavingId] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, communityId: null, communityName: '' })

  useEffect(() => {
    const fetchCommunities = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const data = await api.getUserCommunities()
        setCommunities(data || [])
      } catch (err) {
        setError(err.message || 'Failed to load groups')
        console.error('Error fetching communities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [isAuthenticated])

  const handleLeaveClick = (communityId, communityName) => {
    setConfirmModal({
      isOpen: true,
      communityId,
      communityName
    })
  }

  const handleLeaveConfirm = async () => {
    const { communityId } = confirmModal
    
    try {
      setLeavingId(communityId)
      await api.leaveCommunity(communityId)
      
      // Remove the community from the list
      setCommunities(prev => prev.filter(comm => comm.id !== communityId))
    } catch (err) {
      setError(err.message || 'Failed to leave group')
      console.error('Error leaving community:', err)
    } finally {
      setLeavingId(null)
      setConfirmModal({ isOpen: false, communityId: null, communityName: '' })
    }
  }

  const handleCommunityClick = (communityName) => {
    navigate(`/r/${encodeURIComponent(communityName)}`)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <h1 className="text-2xl font-bold mb-6">Manage Groups</h1>
          <p className="text-gray-400">Please login to manage your groups</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Manage Groups</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-400">Loading groups...</div>
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>You haven't joined any groups yet.</p>
            <p className="mt-2">Explore groups to get started!</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-4">
              Groups you've joined ({communities.length})
            </p>
            {communities.map((community) => (
              <CommunityCard
                key={community.id}
                name={community.community_name}
                pfp={community.community_picture_url || 'https://via.placeholder.com/150'}
                description={community.description}
                memberCount={community.member_count || 0}
                isJoined={true}
                onClick={() => handleCommunityClick(community.community_name)}
                onLeave={() => handleLeaveClick(community.id, community.community_name)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, communityId: null, communityName: '' })}
        onConfirm={handleLeaveConfirm}
        title="Leave Group"
        message={`Are you sure you want to leave ${confirmModal.communityName}? You can always rejoin later.`}
        confirmText="Leave"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  )
}

export default ManageCommunities
