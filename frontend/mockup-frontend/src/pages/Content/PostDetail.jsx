import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PostCard from '../../components/Cards/PostCard'
import SideContent from '../../components/layouts/SideContent'
import { api } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'

const PostDetail = () => {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return

      try {
        setLoading(true)
        setError('')
        let postData = await api.getPostById(postId)
        
        // This allows moderators to view deleted posts and their comments
        if (!postData && isAuthenticated) {
          try {
            postData = await api.getPostById(postId, true)
          } catch (deletedErr) {
            throw deletedErr
          }
        }
        
        setPost(postData)
      } catch (err) {
        if (err.response?.status === 404 && isAuthenticated) {
          try {
            const postData = await api.getPostById(postId, true)
            setPost(postData)
            return
          } catch (retryErr) {
            setError(err.message || 'Failed to load post')
            console.error('Error fetching post:', err)
          }
        } else {
          setError(err.message || 'Failed to load post')
          console.error('Error fetching post:', err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, isAuthenticated])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading post...</div>
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

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg">Post not found</p>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-wrap gap-6 items-start'>
        {/* Post container*/}
        <div className="flex-grow min-w-0 flex justify-center lg:justify-start">
          <div className='w-full max-w-2xl'>
            <PostCard 
              post={post}
              showCommentsByDefault={true}
              disableHover={true}
              onDelete={(deletedPostId) => {
                navigate('/')
              }}
            />
          </div>
        </div>

        {/* SideContent on the right */}
        <aside className="hidden lg:block lg:w-80 flex-shrink-0">
          <div className="sticky top-10">
            <SideContent header="Post Details" />
          </div>
        </aside>
      </div>
    </>
  )
}

export default PostDetail
