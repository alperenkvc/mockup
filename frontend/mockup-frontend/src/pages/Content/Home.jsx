import React, { useState, useEffect } from 'react'
import PostCard from '../../components/Cards/PostCard'
import SideContent from '../../components/layouts/SideContent'
import { api } from '../../utils/api'

const Home = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await api.getFeed()
        setPosts(data || [])
      } catch (err) {
        setError(err.message || 'Failed to load posts')
        console.error('Error fetching posts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return (
    <>
      <div className='flex flex-wrap gap-6 items-start'>
        {/* Post container*/}
        <div className="flex-grow min-w-0 flex justify-center lg:justify-start">
          <div className='w-full max-w-2xl'>
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-400">Loading posts...</div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {!loading && !error && posts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No posts yet. Be the first to post!</p>
              </div>
            )}
            
            {!loading && posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onDelete={(deletedPostId) => {
                  setPosts(prevPosts => prevPosts.filter(p => p.id !== deletedPostId))
                }}
              />
            ))}
          </div>
        </div>

        {/* SideContent on the right */}
        <aside className="hidden lg:block lg:w-80 flex-shrink-0">
          <div className="sticky top-10">
            <SideContent header="Recent Posts" />
          </div>
        </aside>
      </div>
    </>
  )
}

export default Home