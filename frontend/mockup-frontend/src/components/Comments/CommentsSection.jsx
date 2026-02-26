import React, { useState, useEffect, useRef } from 'react'
import CommentItem from './CommentItem'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const CommentsSection = ({ postId, postAuthorId, onCommentAdded }) => {
  const { isAuthenticated } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.getComments(postId)
      setComments(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load comments')
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0]
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddComment = async () => {
    if ((!commentContent.trim() && !selectedFile) || !isAuthenticated) return

    setIsSubmitting(true)
    try {
      let commentData
      
      if (selectedFile) {
        // Use FormData for media upload
        const formData = new FormData()
        if (commentContent.trim()) {
          formData.append('content', commentContent)
        }
        formData.append('comment_media', selectedFile)
        formData.append('comment_type', 'media')
        commentData = formData
      } else {
        // Regular JSON for text-only comments
        commentData = {
          content: commentContent,
          comment_type: 'text'
        }
      }

      await api.addComment(postId, commentData)
      
      setCommentContent('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Refresh comments to get the nested structure
      await fetchComments()
      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded()
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert(error.message || 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = async (newReply) => {
    // Refresh comments after reply
    await fetchComments()
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">Comments</h3>

      {/* Comment form */}
      {isAuthenticated ? (
        <div className="mb-6">
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="What are your thoughts?"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={4}
          />
          
          {/* File upload area */}
          <div className="mt-2">
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-gray-400 text-sm">
                {selectedFile ? selectedFile.name : 'Drag and drop or click to upload media (optional)'}
              </p>
            </div>
            
            {selectedFile && (
              <div className="mt-2 flex items-center justify-between bg-gray-800 rounded p-2">
                <span className="text-sm text-gray-300 truncate flex-1">{selectedFile.name}</span>
                <button
                  onClick={handleRemoveFile}
                  className="ml-2 text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || (!commentContent.trim() && !selectedFile)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-800 rounded text-center text-gray-400">
          <p>Please log in to comment</p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading comments...</div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postAuthorId={postAuthorId}
              onReply={handleReply}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentsSection
