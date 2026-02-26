import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CommunityCard from '../../components/Cards/CommunityCard'
import ConfirmModal from '../../components/CustomModals/ConfirmModal'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const TopCommunities = () => {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const [communities, setCommunities] = useState([])
    const [userCommunities, setUserCommunities] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [joiningId, setJoiningId] = useState(null)
    const [leavingId, setLeavingId] = useState(null)
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, communityId: null, communityName: '', action: '' })

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError('')
                
                // Fetch all communities
                const allCommunities = await api.getAllCommunities()
                setCommunities(allCommunities || [])

                // Fetch user's communities if authenticated
                if (isAuthenticated) {
                    try {
                        const userComms = await api.getUserCommunities()
                        setUserCommunities(userComms || [])
                    } catch (err) {
                        // If user is not authenticated or error, just continue without user communities
                        console.error('Error fetching user communities:', err)
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load groups')
                console.error('Error fetching communities:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [isAuthenticated])

    const isUserJoined = (communityId) => {
        return userCommunities.some(comm => comm.id === communityId)
    }

    const handleJoinClick = (communityId, communityName) => {
        if (!isAuthenticated) {
            // Could redirect to login or show a message
            return
        }
        setConfirmModal({
            isOpen: true,
            communityId,
            communityName,
            action: 'join'
        })
    }

    const handleLeaveClick = (communityId, communityName) => {
        setConfirmModal({
            isOpen: true,
            communityId,
            communityName,
            action: 'leave'
        })
    }

    const handleJoinConfirm = async () => {
        const { communityId } = confirmModal
        
        try {
            setJoiningId(communityId)
            await api.joinCommunity(communityId)
            
            // Refresh user communities to update join status
            if (isAuthenticated) {
                const userComms = await api.getUserCommunities()
                setUserCommunities(userComms || [])
            }
        } catch (err) {
            setError(err.message || 'Failed to join group')
            console.error('Error joining community:', err)
        } finally {
            setJoiningId(null)
            setConfirmModal({ isOpen: false, communityId: null, communityName: '', action: '' })
        }
    }

    const handleLeaveConfirm = async () => {
        const { communityId } = confirmModal
        
        try {
            setLeavingId(communityId)
            await api.leaveCommunity(communityId)
            
            // Refresh user communities to update join status
            if (isAuthenticated) {
                const userComms = await api.getUserCommunities()
                setUserCommunities(userComms || [])
            }
        } catch (err) {
            setError(err.message || 'Failed to leave group')
            console.error('Error leaving community:', err)
        } finally {
            setLeavingId(null)
            setConfirmModal({ isOpen: false, communityId: null, communityName: '', action: '' })
        }
    }

    const handleCommunityClick = (communityName) => {
        navigate(`/r/${encodeURIComponent(communityName)}`)
    }

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-4xl">
                <h1 className="text-2xl font-bold mb-6">Top Groups</h1>
                
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
                        <p>No groups found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {communities.map((community, index) => {
                            const isJoined = isAuthenticated && isUserJoined(community.id)
                            const isLoading = joiningId === community.id || leavingId === community.id
                            
                            return (
                                <CommunityCard 
                                    key={community.id}
                                    name={community.community_name}
                                    pfp={community.community_picture_url || 'https://via.placeholder.com/150'}
                                    description={community.description}
                                    memberCount={community.member_count || 0}
                                    isJoined={isJoined}
                                    rank={index + 1}
                                    compact={true}
                                    onClick={() => handleCommunityClick(community.community_name)}
                                    onLeave={isJoined ? () => handleLeaveClick(community.id, community.community_name) : undefined}
                                />
                            )
                        })}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen && confirmModal.action === 'join'}
                onClose={() => setConfirmModal({ isOpen: false, communityId: null, communityName: '', action: '' })}
                onConfirm={handleJoinConfirm}
                title="Join Group"
                message={`Join ${confirmModal.communityName}?`}
                confirmText="Join"
                cancelText="Cancel"
                confirmButtonClass="bg-green-500 hover:bg-green-600"
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen && confirmModal.action === 'leave'}
                onClose={() => setConfirmModal({ isOpen: false, communityId: null, communityName: '', action: '' })}
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

export default TopCommunities