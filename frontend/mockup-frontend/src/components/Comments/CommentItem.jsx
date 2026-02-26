import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiArrowUp, HiArrowDown, HiDotsHorizontal } from 'react-icons/hi'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const CommentItem = ({ comment, postAuthorId, onReply, depth = 0 }) => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [userVote, setUserVote] = useState(comment.user_vote || null)
  const [score, setScore] = useState(comment.score || 0)
  const [isVoting, setIsVoting] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content || '')
  const [isDeleting, setIsDeleting] = useState(false)
  const [replyFile, setReplyFile] = useState(null)
  const [isDraggingReply, setIsDraggingReply] = useState(false)
  const replyFileInputRef = useRef(null)

  const isCommentAuthor = isAuthenticated && user?.id === comment.author_id
  const isPostAuthor = comment.author_id === postAuthorId
  const maxDepth = 5
  const canReply = depth < maxDepth

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

  const handleReplyDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingReply(true)
  }

  const handleReplyDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingReply(false)
  }

  const handleReplyDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleReplyDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingReply(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0]
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setReplyFile(file)
      }
    }
  }

  const handleReplyFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setReplyFile(file)
    }
  }

  const handleRemoveReplyFile = () => {
    setReplyFile(null)
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = ''
    }
  }

  const handleReply = async () => {
    if ((!replyContent.trim() && !replyFile) || !isAuthenticated) return

    setIsSubmitting(true)
    try {
      let replyData
      
      if (replyFile) {
        // Use FormData for media upload
        const formData = new FormData()
        if (replyContent.trim()) {
          formData.append('content', replyContent)
        }
        formData.append('parent_id', comment.id)
        formData.append('comment_media', replyFile)
        formData.append('comment_type', 'media')
        replyData = formData
      } else {
        // Regular JSON for text-only replies
        replyData = {
          parent_id: comment.id,
          content: replyContent,
          comment_type: 'text'
        }
      }

      const newReply = await api.addComment(comment.post_id, replyData)
      
      setReplyContent('')
      setReplyFile(null)
      if (replyFileInputRef.current) {
        replyFileInputRef.current.value = ''
      }
      setShowReplyForm(false)
      if (onReply) {
        onReply(newReply)
      }
    } catch (error) {
      console.error('Error adding reply:', error)
      alert(error.message || 'Failed to add reply')
    } finally {
      setIsSubmitting(false)
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
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    setIsDeleting(true)
    try {
      await api.deleteComment(comment.id)
      comment.is_deleted = true
      comment.content = '[deleted]'
      setShowMenu(false)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert(error.message || 'Failed to delete comment')
    } finally {
      setIsDeleting(false)
    }
  }

  if (comment.is_deleted) {
    return (
      <div className={`text-gray-500 italic text-sm ${depth > 0 ? 'ml-8' : ''}`}>
        [deleted]
      </div>
    )
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
      <div className="flex gap-2">
        {/* Vote buttons */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleVote(1)}
            disabled={isVoting || !isAuthenticated}
            className={`p-1 hover:bg-gray-800 rounded transition-colors ${
              userVote === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
            } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <HiArrowUp size={16} />
          </button>
          <span className={`text-xs font-medium ${
            score > 0 ? 'text-green-500' : score < 0 ? 'text-blue-500' : 'text-gray-400'
          }`}>
            {score}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={isVoting || !isAuthenticated}
            className={`p-1 hover:bg-gray-800 rounded transition-colors ${
              userVote === -1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
            } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <HiArrowDown size={16} />
          </button>
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <button
              onClick={() => navigate(`/user/${comment.author_username}`)}
              className="font-medium text-gray-300 hover:text-green-500 hover:underline cursor-pointer"
            >
              {comment.author_username}
            </button>
            {comment.created_at && (
              <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
            )}
            {isPostAuthor && <span className="text-green-500">OP</span>}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded"
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
                <div className="mt-2 max-w-md">
                  {comment.media_url.match(/\.(mp4|webm|ogg|mov)$/i) || comment.comment_type === 'media' && comment.media_url.match(/video/i) ? (
                    <video 
                      src={comment.media_url} 
                      controls 
                      className="w-full rounded max-h-96 object-contain"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img 
                      src={comment.media_url} 
                      alt="Comment media" 
                      className="w-full rounded max-h-96 object-contain"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400">
                {canReply && isAuthenticated && (
                  <button
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="hover:text-gray-300"
                  >
                    Reply
                  </button>
                )}
                {isCommentAuthor && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="hover:text-gray-300"
                    >
                      <HiDotsHorizontal size={16} />
                    </button>
                    {showMenu && (
                      <div className="absolute left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
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
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showReplyForm && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    rows={3}
                  />
                  
                  {/* File upload for reply */}
                  <div
                    onDragEnter={handleReplyDragEnter}
                    onDragOver={handleReplyDragOver}
                    onDragLeave={handleReplyDragLeave}
                    onDrop={handleReplyDrop}
                    onClick={() => replyFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded p-2 text-center cursor-pointer transition-colors text-xs ${
                      isDraggingReply
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                    }`}
                  >
                    <input
                      ref={replyFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleReplyFileInput}
                      className="hidden"
                    />
                    <p className="text-gray-400 text-xs">
                      {replyFile ? replyFile.name : 'Drag and drop or click to upload media (optional)'}
                    </p>
                  </div>
                  
                  {replyFile && (
                    <div className="flex items-center justify-between bg-gray-800 rounded p-2">
                      <span className="text-xs text-gray-300 truncate flex-1">{replyFile.name}</span>
                      <button
                        onClick={handleRemoveReplyFile}
                        className="ml-2 text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleReply}
                      disabled={isSubmitting || (!replyContent.trim() && !replyFile)}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setShowReplyForm(false)
                        setReplyContent('')
                        setReplyFile(null)
                        if (replyFileInputRef.current) {
                          replyFileInputRef.current.value = ''
                        }
                      }}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postAuthorId={postAuthorId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentItem
