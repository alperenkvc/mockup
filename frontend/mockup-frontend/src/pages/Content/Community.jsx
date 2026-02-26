import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { HiUsers, HiCalendar, HiPencil } from 'react-icons/hi'
import SideContent from '../../components/layouts/SideContent'
import PostCard from '../../components/Cards/PostCard'
import ConfirmModal from '../../components/CustomModals/ConfirmModal'
import UpdatePictureModal from '../../components/CustomModals/UpdatePictureModal'
import BanUserModal from '../../components/CustomModals/BanUserModal'
import { api } from '../../utils/api'

const Community = () => {
  const { communityName } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const decodedCommunityName = React.useMemo(() => {
    if (!communityName) return ''
    try {
      return decodeURIComponent(communityName)
    } catch (error) {
      return communityName
    }
  }, [communityName])
  
  const [community, setCommunity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Posts')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [errorPosts, setErrorPosts] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [errorMembers, setErrorMembers] = useState('')
  const [isUpdatePictureModalOpen, setIsUpdatePictureModalOpen] = useState(false)
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false)
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false)
  const [showBanModal, setShowBanModal] = useState(false)
  const [banningUser, setBanningUser] = useState(null)
  const [isBanning, setIsBanning] = useState(false)
  const privacyRef = React.useRef(null)

  const tabs = ['Posts', 'About', 'Members']

  // Fetch community data
  useEffect(() => {
    const fetchCommunity = async () => {
      if (!decodedCommunityName) return
      
      try {
        setLoading(true)
        setError('')
        const communityData = await api.getCommunityByName(decodedCommunityName)
        setCommunity(communityData)
      } catch (err) {
        setError(err.message || 'Failed to load group')
        console.error('Error fetching group:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunity()
  }, [decodedCommunityName])

  // Fetch community posts when community is loaded and Posts tab is active
  useEffect(() => {
    const fetchPosts = async () => {
      if (!community?.id || activeTab !== 'Posts') return

      try {
        setLoadingPosts(true)
        setErrorPosts('')
        const feedData = await api.getCommunityFeed(community.id)
        setPosts(feedData || [])
      } catch (err) {
        setErrorPosts(err.message || 'Failed to load posts')
        console.error('Error fetching group posts:', err)
      } finally {
        setLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [community?.id, activeTab])

  // Fetch community members when community is loaded and Members tab is active
  useEffect(() => {
    const fetchMembers = async () => {
      if (!community?.id || activeTab !== 'Members') return

      try {
        setLoadingMembers(true)
        setErrorMembers('')
        const membersData = await api.getCommunityMembers(community.id)
        setMembers(membersData || [])
      } catch (err) {
        setErrorMembers(err.message || 'Failed to load members')
        console.error('Error fetching group members:', err)
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchMembers()
  }, [community?.id, activeTab])

  const handleJoinClick = () => {
    if (!isAuthenticated) {
      // Could redirect to login or show a message
      return
    }
    handleJoinToggle()
  }

  const handleLeaveClick = () => {
    setShowLeaveModal(true)
  }

  const handleJoinToggle = async () => {
    if (!isAuthenticated || isJoining || !community) return

    const previousJoinState = community.is_joined
    const previousMemberCount = community.member_count

    // Optimistic update
    setCommunity(prev => ({
      ...prev,
      is_joined: !prev.is_joined,
      member_count: prev.is_joined ? prev.member_count - 1 : prev.member_count + 1
    }))
    setIsJoining(true)

    try {
      if (previousJoinState) {
        await api.leaveCommunity(community.id)
      } else {
        await api.joinCommunity(community.id)
      }
      
      // Refresh community data to get accurate state
      const updatedCommunity = await api.getCommunityByName(decodedCommunityName)
      setCommunity(updatedCommunity)
    } catch (error) {
      // Revert optimistic update on error
      setCommunity(prev => ({
        ...prev,
        is_joined: previousJoinState,
        member_count: previousMemberCount
      }))
      console.error('Error toggling join:', error)
      alert(error.message || 'Failed to update join status')
    } finally {
      setIsJoining(false)
      setShowLeaveModal(false)
    }
  }

  const handleLeaveConfirm = () => {
    handleJoinToggle()
  }

  // Close privacy dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (privacyRef.current && !privacyRef.current.contains(event.target)) {
        setShowPrivacyDropdown(false)
      }
    }

    if (showPrivacyDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPrivacyDropdown])

  const handleUpdatePrivacy = async (type) => {
    if (!community?.is_moderator || isUpdatingPrivacy || !community) return

    setIsUpdatingPrivacy(true)
    try {
      await api.updateCommunity(community.id, { type })
      // Refresh community data
      const updatedCommunity = await api.getCommunityByName(decodedCommunityName)
      setCommunity(updatedCommunity)
      setShowPrivacyDropdown(false)
    } catch (err) {
      console.error('Error updating community privacy:', err)
      alert(err.response?.data?.message || err.message || 'Failed to update privacy')
    } finally {
      setIsUpdatingPrivacy(false)
    }
  }

  const handleBanUser = async () => {
    if (!banningUser || isBanning || !community) return

    setIsBanning(true)
    try {
      await api.banUserFromCommunity(community.id, banningUser.user_id)
      // Refresh members list
      const membersData = await api.getCommunityMembers(community.id)
      setMembers(membersData || [])
      setShowBanModal(false)
      setBanningUser(null)
      alert('User has been banned from the group')
    } catch (err) {
      console.error('Error banning user:', err)
      alert(err.response?.data?.message || err.message || 'Failed to ban user')
    } finally {
      setIsBanning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading group...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg">Group not found</p>
      </div>
    )
  }

  return (
    <>
      {/* Flex container for main page - Community content on left, SideContent on right */}
      <div className='flex gap-6'>
        {/* Community content container */}
        <div className="flex-grow min-w-0">
          {/* Community Header Section */}
          <div className="bg-black rounded-lg border border-gray-800 mb-6 p-6">
            <div className="flex items-start gap-4">
              {/* Community Picture */}
              <div className="relative">
                {community.community_picture_url ? (
                  <img 
                    src={community.community_picture_url} 
                    alt={community.community_name} 
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  </div>
                )}
                {community.is_moderator && (
                  <button
                    onClick={() => setIsUpdatePictureModalOpen(true)}
                    className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white rounded-full p-1 shadow-lg transition-colors"
                    title="Update group picture"
                  >
                    <HiPencil size={12} />
                  </button>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-2">
                  {community.community_name}
                </h1>
                {community.description && (
                  <p className="text-gray-300 text-sm mb-3">{community.description}</p>
                )}
                
                {/* Community Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <HiUsers size={16} />
                    <span>{Number(community.member_count || 0).toLocaleString()} members</span>
                  </div>
                  {community.created_at && (
                    <div className="flex items-center gap-1">
                      <HiCalendar size={16} />
                      <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Join/Leave Button and Settings */}
              {isAuthenticated && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {community.is_moderator && (
                    <div className="relative" ref={privacyRef}>
                      <button
                        onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                        disabled={isUpdatingPrivacy}
                        className="px-4 py-2 rounded-full font-semibold transition-colors bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2 disabled:opacity-50"
                      >
                        <HiPencil size={18} />
                        Settings
                      </button>
                      {showPrivacyDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                          <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Privacy Type</div>
                            <button
                              onClick={() => handleUpdatePrivacy('public')}
                              disabled={isUpdatingPrivacy || community.type === 'public'}
                              className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                community.type === 'public' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                              } disabled:opacity-50`}
                            >
                              Public
                            </button>
                            <button
                              onClick={() => handleUpdatePrivacy('restricted')}
                              disabled={isUpdatingPrivacy || community.type === 'restricted'}
                              className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                community.type === 'restricted' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                              } disabled:opacity-50`}
                            >
                              Restricted
                            </button>
                            <button
                              onClick={() => handleUpdatePrivacy('private')}
                              disabled={isUpdatingPrivacy || community.type === 'private'}
                              className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                community.type === 'private' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                              } disabled:opacity-50`}
                            >
                              Private
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {community.is_joined ? (
                    <button
                      onClick={handleLeaveClick}
                      disabled={isJoining}
                      className={`px-6 py-2 rounded-full font-semibold transition-colors bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 ${
                        isJoining ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isJoining ? 'Loading...' : 'Joined'}
                    </button>
                  ) : (
                    <button
                      onClick={handleJoinClick}
                      disabled={isJoining}
                      className={`px-6 py-2 rounded-full font-semibold transition-colors bg-green-500 hover:bg-green-600 text-white ${
                        isJoining ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isJoining ? 'Loading...' : 'Join'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'Posts' && (
              <div>
                {loadingPosts ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-gray-400">Loading posts...</div>
                  </div>
                ) : errorPosts ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorPosts}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>No posts in this group yet.</p>
                    {isAuthenticated && community.is_joined && (
                      <p className="mt-2">Be the first to post!</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        onDelete={(deletedPostId) => {
                          setPosts(prevPosts => prevPosts.filter(p => p.id !== deletedPostId))
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'About' && (
              <div className="bg-black rounded-lg border border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">About {community.community_name}</h2>
                {community.description ? (
                  <p className="text-gray-300 mb-4">{community.description}</p>
                ) : (
                  <p className="text-gray-400 italic">No description available.</p>
                )}
                
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <HiUsers className="text-gray-400" size={20} />
                      <span className="text-gray-300">
                        <span className="font-semibold">{Number(community.member_count || 0).toLocaleString()}</span> members
                      </span>
                    </div>
                    {community.created_at && (
                      <div className="flex items-center gap-2">
                        <HiCalendar className="text-gray-400" size={20} />
                        <span className="text-gray-300">
                          Created <span className="font-semibold">{new Date(community.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Members' && (
              <div className="bg-black rounded-lg border border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Members ({members.length})
                </h2>
                
                {loadingMembers ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-gray-400">Loading members...</div>
                  </div>
                ) : errorMembers ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorMembers}
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>No members found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-900 transition-colors group"
                      >
                        <button
                          onClick={() => navigate(`/user/${member.username}`)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                        {member.profile_picture_url ? (
                          <img
                            src={member.profile_picture_url}
                            alt={member.username}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <HiUsers className="text-gray-400" size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm truncate">
                              {member.username}
                            </p>
                            {member.community_role === 'moderator' && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                                MOD
                              </span>
                            )}
                          </div>
                          {member.joined_at && (
                            <p className="text-gray-400 text-xs">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        </button>
                        {community.is_moderator && member.community_role !== 'moderator' && member.status !== 'banned' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setBanningUser(member)
                              setShowBanModal(true)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Ban user"
                          >
                            Ban
                          </button>
                        )}
                        {member.status === 'banned' && (
                          <span className="px-2 py-1 text-xs font-medium text-red-400 bg-red-600/20 rounded">
                            Banned
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SideContent on the right */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-10">
            <SideContent 
              header={community.community_name}
              stats={{
                members: community.member_count,
                posts: posts.length
              }}
            />
          </div>
        </aside>
      </div>

      {/* Leave Community Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Leave Group"
        message={`Are you sure you want to leave ${community.community_name}? You can always rejoin later.`}
        confirmText="Leave"
        cancelText="Cancel"
        onConfirm={handleLeaveConfirm}
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Update Community Picture Modal */}
      {community.is_moderator && (
        <UpdatePictureModal
          isOpen={isUpdatePictureModalOpen}
          onClose={() => setIsUpdatePictureModalOpen(false)}
          type="community"
          communityId={community?.id}
          onSuccess={async () => {
            // Refresh community data
            const communityData = await api.getCommunityByName(decodedCommunityName)
            setCommunity(communityData)
          }}
        />
      )}

      <BanUserModal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false)
          setBanningUser(null)
        }}
        onConfirm={handleBanUser}
        username={banningUser?.username || ''}
        isLoading={isBanning}
      />
    </>
  )
}

export default Community
