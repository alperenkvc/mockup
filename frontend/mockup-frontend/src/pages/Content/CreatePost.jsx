import React, { useState } from 'react'
import TextPostForm from '../../components/PostForms/TextPostForm'
import LinkPostForm from '../../components/PostForms/LinkPostForm'
import MediaPostForm from '../../components/PostForms/MediaPostForm'
import PollPostForm from '../../components/PostForms/PollPostForm'

const CreatePost = () => {
  const [postType, setPostType] = useState(null)

  const handleTextClick = () => {
    setPostType('text')
  }

  const handleImageClick = () => {
    setPostType('image')
  }

  const handleLinkClick = () => {
    setPostType('link')
  }

  const handlePollClick = () => {
    setPostType('poll')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Create Post</h1>

      <div className="flex gap-2 mb-6">
        <button 
          onClick={handleTextClick}
          className={`px-4 py-2 font-medium transition-colors relative ${
            postType === 'text' 
              ? 'text-white' 
              : 'text-gray-300 hover:text-gray-200'
          }`}
        >
          Text
          {postType === 'text' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
          )}
        </button>
        <button 
          onClick={handleImageClick}
          className={`px-4 py-2 font-medium transition-colors relative ${
            postType === 'image' 
              ? 'text-white' 
               : 'text-gray-300 hover:text-gray-200'
          }`}
        >
          Images & Video
          {postType === 'image' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
          )}
        </button>
        <button 
          onClick={handleLinkClick}
          className={`px-4 py-2 font-medium transition-colors relative ${
            postType === 'link' 
              ? 'text-white' 
              : 'text-gray-300 hover:text-gray-200'
          }`}
        >
          Link
          {postType === 'link' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
          )}
        </button>
        <button 
          onClick={handlePollClick}
          className={`px-4 py-2 font-medium transition-colors relative ${
            postType === 'poll' 
              ? 'text-white' 
              : 'text-gray-300 hover:text-gray-200'
          }`}
        >
          Poll
          {postType === 'poll' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
          )}
        </button>
      </div>

      {postType === 'text' && <TextPostForm />}
      {postType === 'image' && <MediaPostForm />}
      {postType === 'link' && <LinkPostForm />}
      {postType === 'poll' && <PollPostForm />}
    </div>
  )
}

export default CreatePost