import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext';
import { FaUser } from 'react-icons/fa';
import { HiPencil } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import SideContent from '../../components/layouts/SideContent';
import PostCard from '../../components/Cards/PostCard';
import UserCommentItem from '../../components/Comments/UserCommentItem';
import FollowersModal from '../../components/CustomModals/FollowersModal';
import UpdatePictureModal from '../../components/CustomModals/UpdatePictureModal';
import { api } from '../../utils/api';

const UserProfile = () => {
  const { username } = useParams()
  const { user: loggedInUser, isAuthenticated } = useAuth();
  const [profileUser, setProfileUser] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [activeTab, setActiveTab] = useState('Overview');
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [errorSaved, setErrorSaved] = useState('');
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [errorPosts, setErrorPosts] = useState('');
  const [userComments, setUserComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [errorComments, setErrorComments] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [errorDrafts, setErrorDrafts] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalType, setFollowersModalType] = useState('followers');
  const [isUpdatePictureModalOpen, setIsUpdatePictureModalOpen] = useState(false);

  const isOwnProfile = isAuthenticated && loggedInUser?.username === username
  const tabs = isOwnProfile ? ['Overview', 'Posts', 'Comments', 'Saved', 'Drafts'] : ['Overview', 'Posts', 'Comments'];

  // Fetch profile user data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return
      
      try {
        setLoadingProfile(true)
        setProfileError('')
        const userData = await api.getUserProfileByUsername(username)
        setProfileUser(userData)
        // Set follow state and followers/following count from profile data
        setIsFollowing(userData?.is_followed_by_me || false)
        // Ensure counts are converted to numbers (handle string "01" -> 1)
        setFollowersCount(Number(userData?.followers_count) || 0)
        setFollowingCount(Number(userData?.following_count) || 0)
      } catch (err) {
        setProfileError(err.message || 'Failed to load profile')
        console.error('Error fetching profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [username])

  const achievements = profileUser?.achievements || []
  const displayUser = profileUser || loggedInUser

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (activeTab === 'Saved' && isOwnProfile) {
        try {
          setLoadingSaved(true);
          setErrorSaved('');
          const posts = await api.getSavedPosts();
          setSavedPosts(posts || []);
        } catch (err) {
          setErrorSaved(err.message || 'Failed to load saved posts');
          console.error('Error fetching saved posts:', err);
        } finally {
          setLoadingSaved(false);
        }
      }
    };

    fetchSavedPosts();
  }, [activeTab, isOwnProfile]);

  useEffect(() => {
    const fetchDrafts = async () => {
      if (activeTab === 'Drafts' && isOwnProfile) {
        try {
          setLoadingDrafts(true);
          setErrorDrafts('');
          const draftsData = await api.getDrafts();
          setDrafts(draftsData || []);
        } catch (err) {
          setErrorDrafts(err.message || 'Failed to load drafts');
          console.error('Error fetching drafts:', err);
        } finally {
          setLoadingDrafts(false);
        }
      }
    };

    fetchDrafts();
  }, [activeTab, isOwnProfile]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (activeTab === 'Posts' && displayUser?.id) {
        try {
          setLoadingPosts(true);
          setErrorPosts('');
          const posts = await api.getPostsByUser(displayUser.id);
          setUserPosts(posts || []);
        } catch (err) {
          setErrorPosts(err.message || 'Failed to load posts');
          console.error('Error fetching user posts:', err);
        } finally {
          setLoadingPosts(false);
        }
      }
    };

    fetchUserPosts();
  }, [activeTab, displayUser?.id]);

  useEffect(() => {
    const fetchUserComments = async () => {
      if (activeTab === 'Comments' && displayUser?.id) {
        try {
          setLoadingComments(true);
          setErrorComments('');
          const comments = await api.getCommentsByUser(displayUser.id);
          setUserComments(comments || []);
        } catch (err) {
          setErrorComments(err.message || 'Failed to load comments');
          console.error('Error fetching user comments:', err);
        } finally {
          setLoadingComments(false);
        }
      }
    };

    fetchUserComments();
  }, [activeTab, displayUser?.id]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !displayUser?.id || isFollowingLoading) return

    const previousFollowState = isFollowing
    const previousFollowersCount = followersCount

    // Optimistic update
    setIsFollowing(!isFollowing)
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1)
    setIsFollowingLoading(true)

    try {
      if (isFollowing) {
        await api.unfollowUser(displayUser.id)
      } else {
        await api.followUser(displayUser.id)
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(previousFollowState)
      setFollowersCount(previousFollowersCount)
      console.error('Error toggling follow:', error)
      alert(error.message || 'Failed to update follow status')
    } finally {
      setIsFollowingLoading(false)
    }
  }

  const handleOpenFollowersModal = (type = 'followers') => {
    setFollowersModalType(type)
    setIsFollowersModalOpen(true)
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">{profileError}</div>
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg">User not found</p>
      </div>
    );
  }

  return (
    <>
      {/* Flex container for main page - Profile content on left, SideContent on right */}
      <div className='flex gap-6'>
        {/* Profile content container */}
        <div className="flex-grow min-w-0">
          {/* User Avatar and Name Section */}
          <div className="mb-6 pb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                {displayUser?.profile_picture_url ? (
                  <img 
                    src={displayUser.profile_picture_url} 
                    alt={displayUser?.username} 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                    <FaUser className="text-gray-400" size={32} />
                  </div>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => setIsUpdatePictureModalOpen(true)}
                    className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                    title="Update profile picture"
                  >
                    <HiPencil size={14} />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{displayUser?.username}</h1>
              </div>
              {!isOwnProfile && isAuthenticated && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowingLoading}
                  className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                    isFollowing
                      ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } ${isFollowingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowingLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>

            {/* Mobile Stats - shown on mobile, hidden on desktop */}
            <div className="lg:hidden grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
              {followersCount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Followers</p>
                  <button
                    onClick={() => handleOpenFollowersModal('followers')}
                    className="text-lg font-semibold text-white hover:text-green-500 transition-colors cursor-pointer"
                  >
                    {Number(followersCount).toLocaleString()}
                  </button>
                </div>
              )}
              {followingCount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Following</p>
                  <button
                    onClick={() => handleOpenFollowersModal('following')}
                    className="text-lg font-semibold text-white hover:text-green-500 transition-colors cursor-pointer"
                  >
                    {Number(followingCount).toLocaleString()}
                  </button>
                </div>
              )}
              {displayUser?.karma !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Karma</p>
                  <p className="text-lg font-semibold text-white">{Number(displayUser.karma).toLocaleString()}</p>
                </div>
              )}
              {displayUser?.posts_count !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contributions</p>
                  <p className="text-lg font-semibold text-white">{Number(displayUser.posts_count).toLocaleString()}</p>
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
            {activeTab === 'Overview' && (
              <div>
                <p className="text-gray-400">Overview content will go here</p>
              </div>
            )}
            
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
                ) : userPosts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>{isOwnProfile ? 'No posts yet.' : 'This user hasn\'t posted yet.'}</p>
                    {isOwnProfile && (
                      <p className="mt-2">Start sharing your thoughts!</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        onDelete={(deletedPostId) => {
                          setUserPosts(prevPosts => prevPosts.filter(p => p.id !== deletedPostId))
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'Comments' && (
              <div>
                {loadingComments ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-gray-400">Loading comments...</div>
                  </div>
                ) : errorComments ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorComments}
                  </div>
                ) : userComments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>{isOwnProfile ? 'No comments yet.' : 'This user hasn\'t commented yet.'}</p>
                    {isOwnProfile && (
                      <p className="mt-2">Start engaging with the group!</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userComments.map((comment) => (
                      <UserCommentItem
                        key={comment.id}
                        comment={comment}
                        onDelete={(deletedCommentId) => {
                          setUserComments(prevComments => prevComments.filter(c => c.id !== deletedCommentId))
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'Saved' && (
              <div>
                {loadingSaved ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-gray-400">Loading saved posts...</div>
                  </div>
                ) : errorSaved ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorSaved}
                  </div>
                ) : savedPosts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>{isOwnProfile ? 'No saved posts yet.' : 'This user hasn\'t saved any posts yet.'}</p>
                    {isOwnProfile && (
                      <p className="mt-2">Save posts you want to read later!</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedPosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        onUnsave={() => {
                          // Remove post from saved list when unsaved
                          setSavedPosts(prev => prev.filter(p => p.id !== post.id))
                        }}
                        onDelete={(deletedPostId) => {
                          setSavedPosts(prevPosts => prevPosts.filter(p => p.id !== deletedPostId))
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'Drafts' && (
              <div>
                {loadingDrafts ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-gray-400">Loading drafts...</div>
                  </div>
                ) : errorDrafts ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorDrafts}
                  </div>
                ) : drafts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>No drafts yet.</p>
                    <p className="mt-2">Start writing a post and save it as a draft!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.map((post) => (
                      <div key={post.id} className="relative">
                        <div className="absolute top-2 right-2 z-10">
                          <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-2 py-1 rounded-full border border-yellow-500/30">
                            Draft
                          </span>
                        </div>
                        <PostCard 
                          post={post}
                          onDelete={(deletedPostId) => {
                            setDrafts(prevDrafts => prevDrafts.filter(p => p.id !== deletedPostId))
                          }}
                        />
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
              header={displayUser?.username} 
              stats={{
                followers: followersCount,
                following: followingCount,
                karma: displayUser?.karma ?? 0,
                contributions: displayUser?.posts_count ?? 0,
                onFollowersClick: () => handleOpenFollowersModal('followers'),
                onFollowingClick: () => handleOpenFollowersModal('following')
              }}
              achievements={achievements}
            />
          </div>
        </aside>
      </div>

      {/* Followers Modal */}
      {displayUser?.id && (
        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          userId={displayUser.id}
          type={followersModalType}
        />
      )}

      {isOwnProfile && (
        <UpdatePictureModal
          isOpen={isUpdatePictureModalOpen}
          onClose={() => setIsUpdatePictureModalOpen(false)}
          type="user"
          onSuccess={async () => {
            // Refresh profile data
            const userData = await api.getUserProfileByUsername(username)
            setProfileUser(userData)
          }}
        />
      )}
    </>
  )
}

export default UserProfile