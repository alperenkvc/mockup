import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiArrowUp, HiArrowDown, HiChat, HiShare, HiDotsVertical, HiTrash } from 'react-icons/hi'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import CommentsSection from '../Comments/CommentsSection'
import ConfirmModal from '../CustomModals/ConfirmModal'
import DeletePostModal from '../CustomModals/DeletePostModal'

const PostCard = ({ post, onUnsave, onDelete, showCommentsByDefault = false, disableHover = false }) => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [userVote, setUserVote] = useState(null) // null, 1 (upvote), or -1 (downvote)
  const [voteCounts, setVoteCounts] = useState({ upvotes: 0, downvotes: 0 })
  const [isVoting, setIsVoting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showComments, setShowComments] = useState(showCommentsByDefault)
  const [commentCount, setCommentCount] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pollData, setPollData] = useState([])
  const [userPollVote, setUserPollVote] = useState(null) // optionId that user voted for
  const [isPollVoting, setIsPollVoting] = useState(false)
  const [showFeedDropdown, setShowFeedDropdown] = useState(false)
  const [userFeeds, setUserFeeds] = useState([])
  const [loadingFeeds, setLoadingFeeds] = useState(false)
  const [addingToFeed, setAddingToFeed] = useState(null)
  const [showModeratorDeleteModal, setShowModeratorDeleteModal] = useState(false)
  const [isModeratorDeleting, setIsModeratorDeleting] = useState(false)
  const [isModerator, setIsModerator] = useState(false)
  const menuRef = useRef(null)

  if (!post) return null

  const {
    id,
    title,
    post_type,
    body_text,
    media_url,
    link_url,
    og_title,
    og_image,
    author_name,
    community_name,
    community_id, // Community ID if available
    upvotes: initialUpvotes = 0,
    downvotes: initialDownvotes = 0,
    created_at,
    poll_data,
    user_vote, // From backend if available
    is_saved, // From backend if available
    author_id,
    comment_count // From backend if available
  } = post

  // Initialize vote state from props
  useEffect(() => {
    setVoteCounts({ upvotes: initialUpvotes, downvotes: initialDownvotes })
    if (user_vote !== undefined) {
      setUserVote(user_vote)
    }
    if (is_saved !== undefined) {
      setIsSaved(is_saved)
    }
    if (comment_count !== undefined) {
      setCommentCount(comment_count)
    }
    // Handle poll_data
    if (poll_data && Array.isArray(poll_data)) {
      setPollData(poll_data)
    } else {
      setPollData([])
    }
  }, [initialUpvotes, initialDownvotes, user_vote, is_saved, comment_count, poll_data])

  const score = voteCounts.upvotes - voteCounts.downvotes
  const timeAgo = created_at ? formatDistanceToNow(new Date(created_at), { addSuffix: true }) : ''
  const isAuthor = user && author_id && user.id === author_id

  // Check if user is moderator of the post's community
  useEffect(() => {
    const checkModeratorStatus = async () => {
      if (!isAuthenticated || !community_id || !user) {
        setIsModerator(false)
        return
      }

      try {
        // Fetch community data to check moderator status
        const communityData = await api.getCommunityByName(community_name)
        setIsModerator(communityData?.is_moderator || false)
      } catch (error) {
        console.error('Error checking moderator status:', error)
        setIsModerator(false)
      }
    }

    if (community_name && community_id) {
      checkModeratorStatus()
    }
  }, [isAuthenticated, community_id, community_name, user])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
        setShowFeedDropdown(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Close feed dropdown when menu closes
  useEffect(() => {
    if (!showMenu) {
      setShowFeedDropdown(false)
    }
  }, [showMenu])

  const handleVote = async (voteValue) => {
    if (!isAuthenticated) {
      // Could show login modal or redirect
      return
    }

    // If clicking the same vote button, unvote
    const newVoteValue = userVote === voteValue ? 0 : voteValue

    // Optimistic update
    const previousVote = userVote
    const previousCounts = { ...voteCounts }
    
    // Calculate new counts optimistically
    let newUpvotes = voteCounts.upvotes
    let newDownvotes = voteCounts.downvotes

    if (previousVote === 1) {
      newUpvotes--
    } else if (previousVote === -1) {
      newDownvotes--
    }

    if (newVoteValue === 1) {
      newUpvotes++
    } else if (newVoteValue === -1) {
      newDownvotes++
    }

    setUserVote(newVoteValue)
    setVoteCounts({ upvotes: newUpvotes, downvotes: newDownvotes })
    setIsVoting(true)

    try {
      const response = await api.votePost(id, newVoteValue)
      
      // Update with server response
      if (response.upvotes !== undefined && response.downvotes !== undefined) {
        setVoteCounts({ upvotes: response.upvotes, downvotes: response.downvotes })
      }
      
      // Update user vote based on response
      if (response.current_user_vote !== undefined) {
        setUserVote(response.current_user_vote)
      } else {
        setUserVote(newVoteValue)
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserVote(previousVote)
      setVoteCounts(previousCounts)
      console.error('Error voting:', error)
      // Could show error toast here
    } finally {
      setIsVoting(false)
    }
  }

  const handleSave = async () => {
    if (!isAuthenticated) {
      return
    }

    setIsSaving(true)
    const previousSaved = isSaved

    // Optimistic update
    setIsSaved(!isSaved)

    try {
      const response = await api.toggleSavePost(id)
      setIsSaved(response.isSaved)
      
      // If unsaved and onUnsave callback provided, call it
      if (!response.isSaved && onUnsave) {
        onUnsave()
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsSaved(previousSaved)
      console.error('Error saving post:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${id}`
    try {
      await navigator.clipboard.writeText(postUrl)
      // Could show a toast notification here
      setShowMenu(false)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      // Fallback: select text
      const textArea = document.createElement('textarea')
      textArea.value = postUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setShowMenu(false)
      } catch (err) {
        console.error('Fallback copy failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleDelete = async () => {
    if (!isAuthenticated) {
      alert('You must be logged in to delete a post.')
      return
    }

    if (!isAuthor) {
      alert('You do not have permission to delete this post.')
      return
    }

    setIsDeleting(true)
    try {
      await api.deletePost(id)
      setShowDeleteModal(false)
      setShowMenu(false)
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(id)
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      // Extract error message from API response
      const errorMessage = error.message || 'Failed to delete post. Please try again.'
      alert(errorMessage)
      setIsDeleting(false)
      // Keep modal open on error so user can try again or cancel
    }
  }

  const handleModeratorDelete = async (reason) => {
    if (!isAuthenticated || !isModerator) {
      alert('You do not have permission to delete this post.')
      return
    }

    setIsModeratorDeleting(true)
    try {
      await api.moderatorDeletePost(id, reason)
      setShowModeratorDeleteModal(false)
      setShowMenu(false)
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(id)
      }
    } catch (error) {
      console.error('Error deleting post as moderator:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete post. Please try again.'
      alert(errorMessage)
      setIsModeratorDeleting(false)
    }
  }

  const handleShowFeedDropdown = async () => {
    if (!isAuthenticated || !community_name) return
    
    // Toggle dropdown if already showing
    if (showFeedDropdown) {
      setShowFeedDropdown(false)
      return
    }
    
    setShowFeedDropdown(true)
    setLoadingFeeds(true)
    
    try {
      const feeds = await api.getUserFeeds()
      setUserFeeds(feeds || [])
    } catch (error) {
      console.error('Error fetching feeds:', error)
      alert('Failed to load your feeds')
      setShowFeedDropdown(false)
    } finally {
      setLoadingFeeds(false)
    }
  }

  const handleAddToFeed = async (feedId) => {
    if (!community_name) return
    
    setAddingToFeed(feedId)
    
    try {
      // Get community ID
      let targetCommunityId = community_id
      
      if (!targetCommunityId && community_name) {
        const communityData = await api.getCommunityByName(community_name)
        targetCommunityId = communityData.id
      }
      
      if (!targetCommunityId) {
        alert('Could not find community ID')
        return
      }
      
      await api.addCommunityToFeed(feedId, targetCommunityId)
      alert('Community added to feed successfully!')
      setShowFeedDropdown(false)
      setShowMenu(false)
    } catch (error) {
      console.error('Error adding community to feed:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add community to feed'
      alert(errorMessage)
      // Don't close dropdown on error, let user try again
    } finally {
      setAddingToFeed(null)
    }
  }

  const handlePollVote = async (optionId) => {
    if (!isAuthenticated || isPollVoting || userPollVote) return

    setIsPollVoting(true)
    const previousPollData = [...pollData]

    try {
      await api.votePoll(id, optionId)
      setUserPollVote(optionId)
      
      // Optimistically update vote count
      setPollData(prevData => 
        prevData.map(option => 
          option.id === optionId 
            ? { ...option, vote_count: (option.vote_count || 0) + 1 }
            : option
        )
      )
    } catch (error) {
      // Revert on error
      setPollData(previousPollData)
      console.error('Error voting on poll:', error)
      if (error.message?.includes('already voted')) {
        alert('You have already voted in this poll.')
      } else if (error.message?.includes('expired')) {
        alert('This poll has expired.')
      } else {
        alert(error.message || 'Failed to vote on poll. Please try again.')
      }
    } finally {
      setIsPollVoting(false)
    }
  }

  const renderPostContent = () => {
    switch (post_type) {
      case 'text':
        return body_text && (
          <p className="text-gray-300 whitespace-pre-wrap">{body_text}</p>
        )
      
      case 'image':
        return media_url && (
          <div className="mt-3">
            <img 
              src={media_url} 
              alt={title} 
              className="w-full rounded-lg max-h-96 object-contain"
            />
          </div>
        )
      
      case 'link':
        return (
          <div className="mt-3">
            {og_image && (
              <img 
                src={og_image} 
                alt={og_title || title}
                className="w-full rounded-t-lg max-h-64 object-cover"
              />
            )}
            <a 
              href={link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block p-4 bg-gray-800 rounded-b-lg hover:bg-gray-700 transition-colors"
            >
              <p className="text-green-500 font-medium">{og_title || title}</p>
              <p className="text-gray-400 text-sm mt-1">{link_url}</p>
            </a>
          </div>
        )
      
      case 'poll':
        return pollData && Array.isArray(pollData) && pollData.length > 0 && (
          <div className="mt-3 space-y-2">
            {(() => {
              const totalVotes = pollData.reduce((sum, opt) => sum + (opt.vote_count || 0), 0)
              const hasVoted = userPollVote !== null
              
              return pollData.map((option) => {
                const voteCount = option.vote_count || 0
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                const isSelected = userPollVote === option.id
                const isClickable = !hasVoted && isAuthenticated && !isPollVoting
                
                return (
                  <div 
                    key={option.id} 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isClickable) {
                        handlePollVote(option.id)
                      }
                    }}
                    className={`p-3 bg-gray-800 rounded-lg transition-all relative overflow-hidden ${
                      isClickable 
                        ? 'hover:bg-gray-700 cursor-pointer' 
                        : 'cursor-default'
                    } ${isSelected ? 'ring-2 ring-green-500' : ''}`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className={`text-gray-300 ${isSelected ? 'font-medium' : ''}`}>
                        {option.option_text}
                      </span>
                      <span className="text-sm text-gray-400">
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                        {hasVoted && ` (${percentage}%)`}
                      </span>
                    </div>
                    {hasVoted && (
                      <div 
                        className="absolute left-0 top-0 h-full bg-orange-500/20 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </div>
                )
              })
            })()}
            {!isAuthenticated && (
              <p className="text-sm text-gray-400 mt-2">Log in to vote in this poll</p>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  const hoverClasses = disableHover 
    ? '' 
    : 'hover:border-gray-700 hover:bg-gray-900'

  const handlePostClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('button, a, [role="button"]')) {
      return
    }
    navigate(`/post/${id}`)
  }

  return (
    <div 
      className={`bg-black rounded-lg w-full mb-4 border border-gray-800 transition-colors cursor-pointer ${hoverClasses}`}
      onClick={handlePostClick}
    >
      <div className="p-4">
        {/* Post Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {community_name && (
              <>
                <span 
                  className="font-medium text-green-500 hover:text-green-400 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/r/${encodeURIComponent(community_name)}`)
                  }}
                >
                  {community_name}
                </span>
                <span>•</span>
              </>
            )}
            <span 
              className="hover:text-white cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/user/${author_name}`)
              }}
            >
              {author_name}
            </span>
            {timeAgo && (
              <>
                <span>•</span>
                <span>{timeAgo}</span>
              </>
            )}
          </div>
          
          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-300"
            >
              <HiDotsVertical size={20} />
            </button>
            
            {showMenu && (
              <div 
                className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-[160px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShare()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <HiShare size={18} />
                  <span>Share</span>
                </button>
                {community_name && isAuthenticated && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShowFeedDropdown()
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <span>Add community to feed</span>
                      <span className="ml-auto">›</span>
                    </button>
                    {showFeedDropdown && (
                      <div 
                        className="absolute right-full top-0 mr-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {loadingFeeds ? (
                          <div className="px-4 py-2 text-sm text-gray-400">Loading feeds...</div>
                        ) : userFeeds.length > 0 ? (
                          userFeeds.map((feed) => (
                            <button
                              key={feed.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddToFeed(feed.id)
                              }}
                              disabled={addingToFeed === feed.id}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              <span className="truncate">{feed.feed_name}</span>
                              {addingToFeed === feed.id && (
                                <span className="ml-auto text-xs">Adding...</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-400">No feeds available</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {isAuthor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteModal(true)
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                  >
                    <HiTrash size={18} />
                    <span>Delete</span>
                  </button>
                )}
                {isModerator && !isAuthor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowModeratorDeleteModal(true)
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                  >
                    <HiTrash size={18} />
                    <span>Delete as Moderator</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Title */}
        <h2 className="text-lg font-semibold mb-3 text-white">
          {title}
        </h2>

        {/* Post Content */}
        {renderPostContent()}

        {/* Post Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleVote(1)}
              disabled={isVoting || !isAuthenticated}
              className={`p-1 hover:bg-gray-800 rounded transition-colors ${
                userVote === 1 ? 'bg-green-500/20' : ''
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <HiArrowUp 
                className={`${
                  userVote === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
                }`} 
                size={20} 
              />
            </button>
            <span className={`text-sm font-medium px-1 ${
              score > 0 ? 'text-green-500' : score < 0 ? 'text-blue-500' : 'text-gray-300'
            }`}>
              {score}
            </span>
            <button 
              onClick={() => handleVote(-1)}
              disabled={isVoting || !isAuthenticated}
              className={`p-1 hover:bg-gray-800 rounded transition-colors ${
                userVote === -1 ? 'bg-blue-500/20' : ''
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <HiArrowDown 
                className={`${
                  userVote === -1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
                }`} 
                size={20} 
              />
            </button>
          </div>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-300 p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <HiChat size={20} />
            <span className="text-sm">Comment</span>
            {commentCount > 0 && (
              <span className="text-xs text-gray-500">({commentCount})</span>
            )}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving || !isAuthenticated}
            className={`flex items-center justify-center w-8 h-8 p-1 hover:bg-gray-800 rounded transition-colors ml-auto ${
              isSaved 
                ? 'text-green-500 hover:text-green-400' 
                : 'text-gray-400 hover:text-gray-300'
            } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isSaved ? 'Unsave post' : 'Save post'}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill={isSaved ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              strokeWidth="1.5"
              className="w-5 h-5"
            >
              <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v11l-5-2.5L5 16V5z" />
            </svg>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div onClick={(e) => e.stopPropagation()}>
            <CommentsSection 
              postId={id} 
              postAuthorId={author_id}
              onCommentAdded={() => {
                setCommentCount(prev => prev + 1)
                // Refresh comments to get updated count
              }}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setIsDeleting(false) // Reset loading state if user cancels
        }}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        isLoading={isDeleting}
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Moderator Delete Confirmation Modal */}
      <DeletePostModal
        isOpen={showModeratorDeleteModal}
        onClose={() => {
          setShowModeratorDeleteModal(false)
          setIsModeratorDeleting(false)
        }}
        onConfirm={handleModeratorDelete}
        isLoading={isModeratorDeleting}
        isModerator={true}
      />
    </div>
  )
}

export default PostCard
