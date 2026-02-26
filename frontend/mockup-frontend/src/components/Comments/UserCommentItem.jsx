import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiArrowUp, HiArrowDown, HiDotsHorizontal } from 'react-icons/hi'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmModal from '../CustomModals/ConfirmModal'

const UserCommentItem = ({ comment, onDelete }) => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [userVote, setUserVote] = useState(comment.user_vote || null)
  const [score, setScore] = useState(comment.score || 0)
  const [isVoting, setIsVoting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content || '')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCommentAuthor = isAuthenticated && user?.id === comment.author_id

  const handleVote = async (voteValue) => {
    if (!isAuthenticated) return

    const newVoteValue = userVote === voteValue ? null : voteValue
    const previousVote = userVote
    const previousScore = score

    // Optimistic update
    let newScore = score
    if (previousVote === 1) newScore -= 1
    else if (previousVote === -1) newScore += 1
    
    if (newVoteValue === 1) newScore += 1
    else if (newVoteValue === -1) newScore -= 1

    setUserVote(newVoteValue)
    setScore(newScore)
    setIsVoting(true)

    try {
      const response = await api.voteComment(comment.id, voteValue)
      setScore(response.score)
      setUserVote(response.user_vote)
    } catch (error) {
      // Revert on error
      setUserVote(previousVote)
      setScore(previousScore)
      console.error('Error voting:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return

    setIsSubmitting(true)
    try {
      await api.updateComment(comment.id, editContent)
      setIsEditing(false)
      comment.content = editContent
    } catch (error) {
      console.error('Error updating comment:', error)
      alert(error.message || 'Failed to update comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await api.deleteComment(comment.id)
      setShowDeleteModal(false)
      setShowMenu(false)
      if (onDelete) {
        onDelete(comment.id)
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert(error.message || 'Failed to delete comment')
      setIsDeleting(false)
    }
  }

  const handlePostClick = () => {
    navigate(`/post/${comment.post_id}`)
  }

  if (comment.is_deleted) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-gray-500 italic text-sm">[deleted]</div>
        {comment.post_title && (
          <div className="mt-2 text-xs text-gray-400">
            on{' '}
            <button
              onClick={handlePostClick}
              className="text-green-500 hover:text-green-400 hover:underline"
            >
              {comment.post_title}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Post context */}
      {comment.post_title && (
        <div className="mb-2 pb-2 border-b border-gray-700">
          <button
            onClick={handlePostClick}
            className="text-sm text-green-500 hover:text-green-400 hover:underline font-medium"
          >
            {comment.post_title}
          </button>
        </div>
      )}

      <div className="flex gap-3">
        {/* Vote buttons */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleVote(1)}
            disabled={isVoting || !isAuthenticated}
            className={`p-1 hover:bg-gray-700 rounded transition-colors ${
              userVote === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
            } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <HiArrowUp size={18} />
          </button>
          <span className={`text-xs font-medium ${
            score > 0 ? 'text-green-500' : score < 0 ? 'text-blue-500' : 'text-gray-400'
          }`}>
            {score}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={isVoting || !isAuthenticated}
            className={`p-1 hover:bg-gray-700 rounded transition-colors ${
              userVote === -1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
            } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <HiArrowDown size={18} />
          </button>
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            {comment.created_at && (
              <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
            )}
            {comment.is_edited && <span className="text-gray-500">(edited)</span>}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(comment.content || '')
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
              
              {comment.media_url && (
                <img src={comment.media_url} alt="Comment media" className="max-w-md rounded mt-2" />
              )}

              {isCommentAuthor && (
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="hover:text-gray-300"
                    >
                      <HiDotsHorizontal size={16} />
                    </button>
                    {showMenu && (
                      <div className="absolute left-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg z-10 min-w-[120px]">
                        <button
                          onClick={() => {
                            setIsEditing(true)
                            setShowMenu(false)
                          }}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteModal(true)
                            setShowMenu(false)
                          }}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        isLoading={isDeleting}
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  )
}

export default UserCommentItem
