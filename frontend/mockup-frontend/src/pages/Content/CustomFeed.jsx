import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { HiUsers, HiCalendar, HiStar, HiTrash, HiUserGroup, HiPlus, HiPencil, HiCheck, HiX } from 'react-icons/hi'
import { FaMagnifyingGlass as FaSearch } from 'react-icons/fa6'
import PostCard from '../../components/Cards/PostCard'
import ConfirmModal from '../../components/CustomModals/ConfirmModal'
import CollaboratorsModal from '../../components/CustomModals/CollaboratorsModal'
import { api } from '../../utils/api'

const CustomFeed = () => {
  const { feedId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [errorPosts, setErrorPosts] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isJoiningCollab, setIsJoiningCollab] = useState(false)
  const [isQuittingCollab, setIsQuittingCollab] = useState(false)
  const [showAddCommunities, setShowAddCommunities] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [addingCommunity, setAddingCommunity] = useState(null)
  const [removingCommunity, setRemovingCommunity] = useState(null)
  const [showAllCommunities, setShowAllCommunities] = useState(false)
  const [collaborators, setCollaborators] = useState([])
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false)
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [loadingPendingRequests, setLoadingPendingRequests] = useState(false)
  const [handlingRequest, setHandlingRequest] = useState(null)
  const searchRef = useRef(null)
  const privacyRef = useRef(null)

  // Fetch feed details
  useEffect(() => {
    const fetchFeed = async () => {
      if (!feedId) return
      
      try {
        setLoading(true)
        setError('')
        const feedData = await api.getFeedById(feedId)
        setFeed(feedData)
      } catch (err) {
        setError(err.message || 'Failed to load feed')
        console.error('Error fetching feed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeed()
  }, [feedId])

  // Fetch feed posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!feedId) return

      try {
        setLoadingPosts(true)
        setErrorPosts('')
        const postsData = await api.getFeedPosts(feedId)
        setPosts(postsData || [])
      } catch (err) {
        setErrorPosts(err.message || 'Failed to load posts')
        console.error('Error fetching feed posts:', err)
      } finally {
        setLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [feedId])

  // Fetch collaborators
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!feedId) return

      try {
        const result = await api.getFeedCollaborators(feedId);
        setCollaborators(result.collaborators || result || []);
      } catch (err) {
        console.error('Error fetching collaborators:', err)
        setCollaborators([])
      }
    }

    if (feedId) {
      fetchCollaborators()
    }
  }, [feedId])

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!feedId || !feed || !user) return
      
      const isOwner = feed.owner_id === user.id
      if (!isOwner) return

      try {
        setLoadingPendingRequests(true)
        const result = await api.getPendingRequests(feedId)
        setPendingRequests(result.pendingRequests || result || [])
      } catch (err) {
        if (err.response?.status !== 403) {
          console.error('Error fetching pending requests:', err)
        }
        setPendingRequests([])
      } finally {
        setLoadingPendingRequests(false)
      }
    }

    if (feedId && feed && user) {
      fetchPendingRequests()
    }
  }, [feedId, feed, user])

  useEffect(() => {
    if (!showAddCommunities || searchTerm.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await api.search(searchTerm.trim())
        // Filter to only show communities
        const communityResults = (results || []).filter(result => result.type === 'Community')
        setSearchResults(communityResults)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, showAddCommunities])

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        if (!event.target.closest('[data-add-communities-button]')) {
          setShowAddCommunities(false)
          setSearchTerm('')
          setSearchResults([])
        }
      }
      if (privacyRef.current && !privacyRef.current.contains(event.target)) {
        setShowPrivacyDropdown(false)
      }
    }

    if (showAddCommunities || showPrivacyDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddCommunities, showPrivacyDropdown])

  const handleAddCommunity = async (communityId) => {
    if (!feedId || addingCommunity) return

    setAddingCommunity(communityId)
    try {
      await api.addCommunityToFeed(feedId, communityId)
      // Refresh feed data to get updated communities list
      const feedData = await api.getFeedById(feedId)
      setFeed(feedData)
      // Clear search
      setSearchTerm('')
      setSearchResults([])
      const postsData = await api.getFeedPosts(feedId)
      setPosts(postsData || [])
    } catch (error) {
      console.error('Error adding community:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add group'
      alert(errorMessage)
    } finally {
      setAddingCommunity(null)
    }
  }

  const handleRemoveCommunity = async (communityId, e) => {
    e.stopPropagation()
    if (!feedId || removingCommunity) return

    if (!window.confirm('Are you sure you want to remove this group from the content capsule?')) {
      return
    }

    setRemovingCommunity(communityId)
    try {
      await api.removeCommunityFromFeed(feedId, communityId)
      // Refresh feed data to get updated communities list
      const feedData = await api.getFeedById(feedId)
      setFeed(feedData)
      // Refresh posts
      const postsData = await api.getFeedPosts(feedId)
      setPosts(postsData || [])
    } catch (error) {
      console.error('Error removing community:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove group'
      alert(errorMessage)
    } finally {
      setRemovingCommunity(null)
    }
  }

  const isCommunityInFeed = (communityId) => {
    return feed?.communities?.some(c => c.id === communityId)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await api.deleteFeed(feedId)
      navigate('/')
    } catch (err) {
      console.error('Error deleting feed:', err)
      alert(err.message || 'Failed to delete feed')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleToggleLike = async () => {
    if (!isAuthenticated || isLiking) return

    setIsLiking(true)
    try {
      const result = await api.toggleLikeFeed(feedId)
      setFeed(prev => ({
        ...prev,
        is_liked_by_me: result.isLiked,
        likes_count: result.newCount
      }))
    } catch (err) {
      console.error('Error toggling like:', err)
    } finally {
      setIsLiking(false)
    }
  }

  const handleJoinCollaboration = async () => {
    if (!isAuthenticated || isJoiningCollab) return

    setIsJoiningCollab(true)
    try {
      const result = await api.joinCollaboration(feedId)
      // Refresh feed data to get updated collaboration status
      const feedData = await api.getFeedById(feedId)
      setFeed(feedData)
      alert(result.message || 'Collaboration request sent')
    } catch (err) {
      console.error('Error joining collaboration:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to join collaboration'
      alert(errorMessage)
    } finally {
      setIsJoiningCollab(false)
    }
  }

  const handleQuitCollaboration = async () => {
    if (!isAuthenticated || isQuittingCollab) return

    if (!window.confirm('Are you sure you want to quit this collaboration? You will no longer be able to add groups to this content capsule.')) {
      return
    }

    setIsQuittingCollab(true)
    try {
      const result = await api.quitCollaboration(feedId)
      // Refresh feed data to get updated collaboration status
      const feedData = await api.getFeedById(feedId)
      setFeed(feedData)
      alert(result.message || 'You have quit the collaboration')
    } catch (err) {
      console.error('Error quitting collaboration:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to quit collaboration'
      alert(errorMessage)
    } finally {
      setIsQuittingCollab(false)
    }
  }

  const isOwner = feed && user && feed.owner_id === user.id

  const handleUpdatePrivacy = async (isPrivate) => {
    if (!isOwner || isUpdatingPrivacy) return

    setIsUpdatingPrivacy(true)
    try {
      await api.updateFeed(feedId, { isPrivate })
      // Refresh feed data
      const feedData = await api.getFeedById(feedId)
      setFeed(feedData)
      setShowPrivacyDropdown(false)
    } catch (err) {
      console.error('Error updating feed privacy:', err)
      alert(err.response?.data?.message || err.message || 'Failed to update privacy')
    } finally {
      setIsUpdatingPrivacy(false)
    }
  }

  const handleUpdateCollaboration = async (collaboration_options) => {
    if (!isOwner || isUpdatingPrivacy) return

    setIsUpdatingPrivacy(true)
    try {
      await api.updateFeed(feedId, { collaboration_options })
      // Refresh feed data
      const feedData = await api.getFeedById(feedId)
      setFeed(feedData)
      setShowPrivacyDropdown(false)
    } catch (err) {
      console.error('Error updating collaboration options:', err)
      alert(err.response?.data?.message || err.message || 'Failed to update collaboration options')
    } finally {
      setIsUpdatingPrivacy(false)
    }
  }

  const handleCollabRequest = async (userId, action) => {
    if (!isOwner || handlingRequest) return

    setHandlingRequest(userId)
    try {
      await api.handleCollabRequest(feedId, userId, action)
      // Refresh pending requests and collaborators
      const [pendingResult, collaboratorsResult] = await Promise.all([
        api.getPendingRequests(feedId).catch(() => ({ pendingRequests: [] })),
        api.getFeedCollaborators(feedId)
      ])
      setPendingRequests(pendingResult.pendingRequests || pendingResult || [])
      setCollaborators(collaboratorsResult.collaborators || collaboratorsResult || [])
      alert(`Collaboration request ${action}d successfully`)
    } catch (err) {
      console.error(`Error ${action}ing collaboration request:`, err)
      alert(err.response?.data?.message || err.message || `Failed to ${action} request`)
    } finally {
      setHandlingRequest(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading feed...</div>
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

  if (!feed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg">Feed not found</p>
      </div>
    )
  }

  return (
    <>
      <div className='flex gap-6'>
        {/* Feed content container */}
        <div className="flex-grow min-w-0">
          {/* Feed Header Section */}
          <div className="bg-black rounded-lg border border-gray-800 mb-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <HiStar className="text-green-500" size={24} />
                  <h1 className="text-2xl font-bold text-white">
                    {feed.feed_name}
                  </h1>
                  {feed.is_private && (
                    <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs font-semibold rounded">
                      Private
                    </span>
                  )}
                </div>
                {feed.description && (
                  <p className="text-gray-300 text-sm mb-3">{feed.description}</p>
                )}
                
                {/* Feed Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <HiUsers size={16} />
                    <span>
                      by{' '}
                      {(() => {
                        const allCreators = [
                          { username: feed.owner_username, isOwner: true },
                          ...(collaborators || []).map(c => ({ username: c.username, isOwner: false }))
                        ]
                        
                        if (allCreators.length <= 3) {
                          return (
                            <span>
                              {allCreators.map((creator, index) => (
                                <React.Fragment key={index}>
                                  <button
                                    onClick={() => navigate(`/user/${creator.username}`)}
                                    className="hover:text-white underline"
                                  >
                                    {creator.username}
                                  </button>
                                  {index < allCreators.length - 1 && ', '}
                                </React.Fragment>
                              ))}
                            </span>
                          )
                        } else {
                          const firstThree = allCreators.slice(0, 3)
                          const remaining = allCreators.length - 3
                          return (
                            <span>
                              {firstThree.map((creator, index) => (
                                <React.Fragment key={index}>
                                  <button
                                    onClick={() => navigate(`/user/${creator.username}`)}
                                    className="hover:text-white underline"
                                  >
                                    {creator.username}
                                  </button>
                                  {index < firstThree.length - 1 && ', '}
                                </React.Fragment>
                              ))}
                              {', '}
                              <button
                                onClick={() => setShowCollaboratorsModal(true)}
                                className="hover:text-white underline"
                              >
                                and {remaining} more {remaining === 1 ? 'user' : 'users'}
                              </button>
                            </span>
                          )
                        }
                      })()}
                    </span>
                  </div>
                  {feed.created_at && (
                    <div className="flex items-center gap-1">
                      <HiCalendar size={16} />
                      <span>Created {new Date(feed.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {feed.likes_count > 0 && (
                    <div className="flex items-center gap-1">
                      <HiStar size={16} />
                      <span>{feed.likes_count} likes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {isAuthenticated && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleToggleLike}
                    disabled={isLiking}
                    className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                      feed.is_liked_by_me
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLiking ? '...' : feed.is_liked_by_me ? 'Liked' : 'Like'}
                  </button>
                  {!isOwner && feed.collaboration_options !== 'none' && (
                    <>
                      {feed.my_collab_status === 'approved' ? (
                        <button
                          onClick={handleQuitCollaboration}
                          disabled={isQuittingCollab}
                          className={`px-4 py-2 rounded-full font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white ${isQuittingCollab ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isQuittingCollab ? '...' : 'Quit Collab'}
                        </button>
                      ) : feed.my_collab_status === 'pending' ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-full font-semibold transition-colors bg-yellow-500 text-white opacity-50 cursor-not-allowed"
                        >
                          Pending
                        </button>
                      ) : (
                        <button
                          onClick={handleJoinCollaboration}
                          disabled={isJoiningCollab}
                          className={`px-4 py-2 rounded-full font-semibold transition-colors bg-gray-700 hover:bg-gray-600 text-white ${isJoiningCollab ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isJoiningCollab ? '...' : 'Collab'}
                        </button>
                      )}
                    </>
                  )}
                  {isOwner && (
                    <>
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
                              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Privacy</div>
                              <button
                                onClick={() => handleUpdatePrivacy(false)}
                                disabled={isUpdatingPrivacy || !feed.is_private}
                                className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                  !feed.is_private ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                                } disabled:opacity-50`}
                              >
                                Public
                              </button>
                              <button
                                onClick={() => handleUpdatePrivacy(true)}
                                disabled={isUpdatingPrivacy || feed.is_private}
                                className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                  feed.is_private ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                                } disabled:opacity-50`}
                              >
                                Private
                              </button>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase mt-2">Collaboration</div>
                              <button
                                onClick={() => handleUpdateCollaboration('none')}
                                disabled={isUpdatingPrivacy || feed.collaboration_options === 'none'}
                                className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                  feed.collaboration_options === 'none' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                                } disabled:opacity-50`}
                              >
                                None
                              </button>
                              <button
                                onClick={() => handleUpdateCollaboration('open')}
                                disabled={isUpdatingPrivacy || feed.collaboration_options === 'open'}
                                className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                  feed.collaboration_options === 'open' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                                } disabled:opacity-50`}
                              >
                                Open
                              </button>
                              <button
                                onClick={() => handleUpdateCollaboration('request')}
                                disabled={isUpdatingPrivacy || feed.collaboration_options === 'request'}
                                className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-700 transition-colors ${
                                  feed.collaboration_options === 'request' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                                } disabled:opacity-50`}
                              >
                                Request Only
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 rounded-full font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white"
                      >
                        <HiTrash size={18} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pending Requests Section - Only visible to feed owner */}
          {isOwner && (
            <div className="bg-black rounded-lg border border-gray-800 mb-6 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Pending Collaboration Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded">
                      {pendingRequests.length}
                    </span>
                  )}
                </h2>
              </div>

              {loadingPendingRequests ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Loading requests...
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No pending collaboration requests
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-900 border border-gray-800"
                    >
                      {request.profile_picture_url ? (
                        <img
                          src={request.profile_picture_url}
                          alt={request.username}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <HiUserGroup className="text-gray-400" size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/user/${request.username}`)}
                          className="text-white font-medium text-sm hover:text-green-400 transition-colors"
                        >
                          {request.username}
                        </button>
                        {request.joined_at && (
                          <p className="text-gray-400 text-xs mt-0.5">
                            Requested {new Date(request.joined_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCollabRequest(request.id, 'approve')}
                          disabled={handlingRequest === request.id}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve request"
                        >
                          <HiCheck size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleCollabRequest(request.id, 'deny')}
                          disabled={handlingRequest === request.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Deny request"
                        >
                          <HiX size={16} />
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Posts Section */}
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
              <p>No posts in this feed yet.</p>
              <p className="mt-2 text-sm">Add groups to this content capsule to see posts here.</p>
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

        {/* SideContent on the right */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-10">
            <div className="bg-black rounded-lg border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Groups ({feed.community_count || 0})
                </h2>
                {(isOwner || feed.my_collab_status === 'approved') && (
                  <button
                    data-add-communities-button
                    onClick={() => setShowAddCommunities(!showAddCommunities)}
                    className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                    title="Add more groups"
                  >
                    <HiPlus size={20} />
                  </button>
                )}
              </div>

              {/* Add Groups Search */}
              {showAddCommunities && (
                <div ref={searchRef} className="mb-4">
                  <div className="relative flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-800 border border-gray-700">
                    <FaSearch className="text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-sm"
                      autoFocus
                    />
                  </div>
                  
                  {searchTerm.trim().length >= 2 && (
                    <div className="mt-2 max-h-64 overflow-y-auto border border-gray-700 rounded-lg bg-gray-900">
                      {isSearching ? (
                        <div className="px-4 py-3 text-gray-400 text-sm text-center">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        <div className="py-2">
                          {searchResults.map((result) => {
                            const alreadyAdded = isCommunityInFeed(result.id)
                            return (
                              <div
                                key={result.id}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                  <HiUserGroup className="text-gray-400" size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium text-sm truncate">
                                    {result.display_name}
                                  </p>
                                </div>
                                <button
                                  onClick={() => !alreadyAdded && handleAddCommunity(result.id)}
                                  disabled={alreadyAdded || addingCommunity === result.id}
                                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                                    alreadyAdded
                                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                      : addingCommunity === result.id
                                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                      : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                >
                                  {alreadyAdded
                                    ? 'Added'
                                    : addingCommunity === result.id
                                    ? 'Adding...'
                                    : 'Add'}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-gray-400 text-sm text-center">No groups found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {feed.communities && feed.communities.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {(showAllCommunities ? feed.communities : feed.communities.slice(0, 3)).map((community) => (
                      <div
                        key={community.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900 transition-colors group"
                      >
                        <button
                          onClick={() => navigate(`/r/${encodeURIComponent(community.community_name)}`)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          {community.community_picture_url ? (
                            <img
                              src={community.community_picture_url}
                              alt={community.community_name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <HiUserGroup className="text-gray-400" size={16} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">
                              {community.community_name}
                            </p>
                            {community.member_count > 0 && (
                              <p className="text-gray-400 text-xs">
                                {Number(community.member_count).toLocaleString()} members
                              </p>
                            )}
                          </div>
                        </button>
                        {(isOwner || feed.my_collab_status === 'approved') && (
                          <button
                            onClick={(e) => handleRemoveCommunity(community.id, e)}
                            disabled={removingCommunity === community.id}
                            className="p-1.5 rounded-lg hover:bg-red-600/20 transition-colors text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Remove group"
                          >
                            <HiTrash size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {feed.communities.length > 3 && (
                    <button
                      onClick={() => setShowAllCommunities(!showAllCommunities)}
                      className="w-full mt-2 px-3 py-2 text-sm font-medium text-green-500 hover:text-green-400 hover:bg-gray-900 rounded-lg transition-colors"
                    >
                      {showAllCommunities ? 'Show less' : 'See all'}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No groups added yet</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Content Capsule"
          message={`Are you sure you want to delete "${feed.feed_name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          isLoading={isDeleting}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}

      {/* Collaborators Modal */}
      <CollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        collaborators={collaborators}
        owner={feed ? { username: feed.owner_username, id: feed.owner_id } : null}
      />
    </>
  )
}

export default CustomFeed
