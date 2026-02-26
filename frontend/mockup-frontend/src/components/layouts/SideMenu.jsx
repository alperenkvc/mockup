import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { GoHome } from "react-icons/go";
import { HiOutlineMenu, HiOutlineFire, HiOutlineUserGroup, HiOutlinePlus, HiOutlineChevronDown, HiOutlineChevronRight, HiOutlinePlusCircle } from 'react-icons/hi';
import { BsStar } from 'react-icons/bs';
import { MdOutlineExplore, MdOutlineSettings } from 'react-icons/md';
import { FaUser, FaUserEdit, FaTrophy, FaSignOutAlt } from 'react-icons/fa';
import Modal from '../Modal';
import LoginForm from '../Auth/LoginForm';
import SignUpForm from '../Auth/SignUpForm';
import CreateCommunityModal from '../CustomModals/CreateCommunityModal';
import CreateFeedModal from '../CustomModals/CreateFeedModal';
import NotificationBox from '../Notifications/NotificationBox';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const SideMenu = ({ isExpanded, isPinned, isDesktop = true, togglePin, onMouseEnter, onMouseLeave, closeMobile }) => {
  const navigate = useNavigate();
  const [showCommunities, setShowCommunities] = useState(true);
  const [showFeeds, setShowFeeds] = useState(false);
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  const [isLoginFormOpen, setIsLoginFormOpen] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isCreateFeedModalOpen, setIsCreateFeedModalOpen] = useState(false);
  const [userCommunities, setUserCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [userFeeds, setUserFeeds] = useState([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);

  const { user, logout, isAuthenticated } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
    if (!isDesktop) {
      closeMobile();
    }
  };

  // Fetch user's communities when authenticated
  useEffect(() => {
    const fetchUserCommunities = async () => {
      if (isAuthenticated) {
        try {
          setLoadingCommunities(true);
          const communities = await api.getUserCommunities();
          setUserCommunities(communities || []);
        } catch (error) {
          console.error('Error fetching user communities:', error);
          setUserCommunities([]);
        } finally {
          setLoadingCommunities(false);
        }
      } else {
        setUserCommunities([]);
      }
    };

    fetchUserCommunities();
  }, [isAuthenticated]);

  // Fetch user's feeds when authenticated
  useEffect(() => {
    const fetchUserFeeds = async () => {
      if (isAuthenticated) {
        try {
          setLoadingFeeds(true);
          const feeds = await api.getUserFeeds();
          setUserFeeds(feeds || []);
        } catch (error) {
          console.error('Error fetching user feeds:', error);
          setUserFeeds([]);
        } finally {
          setLoadingFeeds(false);
        }
      } else {
        setUserFeeds([]);
      }
    };

    fetchUserFeeds();
  }, [isAuthenticated]);

  const isFlyout = isDesktop && !isPinned && isExpanded;
  const widthClass = isPinned ? 'w-64' : (isFlyout ? 'w-64' : 'w-0 lg:w-14');
  const positionClass = 'lg:sticky top-[61px]';
  // Higher z-index on mobile when expanded to ensure menu is above backdrop
  const zClass = isFlyout ? 'z-40' : (!isDesktop && isExpanded ? 'z-50' : 'z-30');
  const overflowClass = !isExpanded && !isPinned ? 'overflow-hidden' : 'overflow-y-auto';

  const sideMenuClasses = `relative h-[calc(100vh-61px)] bg-black border-r border-gray-800 ${zClass}
    transition-all duration-300 ease-in-out 
    ${positionClass}
    ${widthClass}
    overflow-visible
  `;

  const contentClasses = `flex flex-col pt-4 pb-4 h-full ${overflowClass} ${!isExpanded && 'items-center'} custom-scrollbar relative z-10`;

  const linkClasses = `flex items-center gap-4 w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors ${!isExpanded && 'justify-center'}`;
  const sectionTitleClasses = `px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider ${!isExpanded && 'hidden'}`;
  const communityItemClasses = `flex items-center gap-3 w-full px-3 py-1.5 rounded hover:bg-gray-800 transition-colors ${!isExpanded && 'justify-center'}`;

  return (
    <>
      {/* Backdrop for mobile drawer - positioned outside menu container */}
      {!isDesktop && isExpanded && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300" 
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      
      <div className={sideMenuClasses} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {/* Pin/unpin toggle for larger screens */}
        <div
          className="hidden lg:block absolute top-4 right-0 z-50 translate-x-1/2"
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              togglePin();
            }}
            className="bg-black text-white focus:outline-none border border-gray-600 rounded-full p-2 hover:bg-gray-700"
          >
            <HiOutlineMenu size={20} />
          </button>
        </div>

        <div className={contentClasses}>
          {/* Main Navigation */}
          <div className="px-2 mb-2">
            <button className={linkClasses} onClick={() => handleNavigation('/')}>
              <GoHome size={20} className="flex-shrink-0" />
              <span className={`${!isExpanded && 'hidden'}`}>Home</span>
            </button>
            <button className={linkClasses} onClick={() => handleNavigation('/popular')}>
              <HiOutlineFire size={20} className="flex-shrink-0" />
              <span className={`${!isExpanded && 'hidden'}`}>Popular</span>
            </button>
          </div>

          {isAuthenticated ? (
            <>
              {/* Mobile-only: User Profile Section */}
              {!isDesktop && (
                <div className="px-2 mb-4 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <FaUser className="text-gray-400" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{user?.username}</p>
                      <p className="text-gray-400 text-xs">View Profile</p>
                    </div>
                  </div>
                  <button className={linkClasses} onClick={() => handleNavigation(`/user/${user?.username}`)}>
                    <FaUser size={20} className="flex-shrink-0" />
                    <span>View Profile</span>
                  </button>
                  <button className={linkClasses} onClick={() => {
                    // Edit avatar functionality - you can add a modal or navigation here
                    console.log('Edit avatar');
                  }}>
                    <FaUserEdit size={20} className="flex-shrink-0" />
                    <span>Edit Avatar</span>
                  </button>
                  <button className={linkClasses} onClick={() => handleNavigation('/achievements')}>
                    <FaTrophy size={20} className="flex-shrink-0" />
                    <span>Achievements</span>
                  </button>
                  {/* Notifications on Mobile */}
                  <div className="px-2">
                    <NotificationBox isInSideMenu={true} />
                  </div>
                  <button className={`${linkClasses} text-green-500 mt-2`} onClick={() => handleNavigation("/submit")}>
                    <HiOutlinePlus size={20} className="flex-shrink-0" />
                    <span>Create Post</span>
                  </button>
                  <button className={`${linkClasses} text-red-400 mt-2`} onClick={() => {
                    logout();
                    closeMobile();
                  }}>
                    <FaSignOutAlt size={20} className="flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              )}

              {/* Communities Section */}
              <div className="mb-2">
                <button
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 rounded ${!isExpanded && 'justify-center'}`}
                  onClick={() => isExpanded && setShowCommunities(!showCommunities)}
                >
                  <span className={sectionTitleClasses}>Groups</span>
                  {isExpanded && (
                    showCommunities ? <HiOutlineChevronDown size={16} /> : <HiOutlineChevronRight size={16} />
                  )}
                </button>

                {isExpanded && showCommunities && (
                  <div className="mt-1">
                    <button className={linkClasses} onClick={() => handleNavigation('/manage-communities')}>
                      <MdOutlineSettings size={20} className="flex-shrink-0" />
                      <span className={`${!isExpanded && 'hidden'}`}>Manage Groups</span>
                    </button>

                    {loadingCommunities ? (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        Loading groups...
                      </div>
                    ) : userCommunities.length > 0 ? (
                      <>
                        {userCommunities.map((community) => (
                          <button
                            key={community.id}
                            className={communityItemClasses}
                            onClick={() => handleNavigation(`/r/${encodeURIComponent(community.community_name)}`)}
                            title={community.description || community.community_name}
                          >
                            {community.community_picture_url ? (
                              <img
                                src={community.community_picture_url}
                                alt={community.community_name}
                                className="w-5 h-5 rounded-full flex-shrink-0 object-cover"
                              />
                            ) : (
                              <span className="text-lg flex-shrink-0">📦</span>
                            )}
                            <span className="text-sm truncate">{community.community_name}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        No groups yet
                      </div>
                    )}

                    {isExpanded && (
                      <button className={`${communityItemClasses} text-blue-400 mt-1`} onClick={() => handleNavigation('/top-communities')}>
                        <HiOutlineUserGroup size={18} className="flex-shrink-0" />
                        <span className="text-sm">Explore Groups</span>
                      </button>
                    )}
                    {/* Start a Community Button */}
                    {isExpanded && (
                      <div className="px-2 mb-4">
                        <button
                          className="w-full bg-black hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full flex items-center justify-center gap-2 transition-colors"
                          onClick={() => setIsCreateCommunityModalOpen(true)}
                        >
                          <HiOutlinePlus size={20} />
                          <span>Start a group</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feeds Section */}
              {isExpanded && (
                <div className="mb-2">
                  <button
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 rounded`}
                    onClick={() => setShowFeeds(!showFeeds)}
                  >
                    <span className={sectionTitleClasses}>Content Capsules</span>
                    {showFeeds ? <HiOutlineChevronDown size={16} /> : <HiOutlineChevronRight size={16} />}
                  </button>

                  {showFeeds && (
                    <div className="mt-1">
                      {loadingFeeds ? (
                        <div className="px-3 py-2 text-sm text-gray-400">
                          Loading content capsules...
                        </div>
                      ) : userFeeds.length > 0 ? (
                        <>
                          {userFeeds.map((feed) => (
                            <button
                              key={feed.id}
                              className={communityItemClasses}
                              onClick={() => handleNavigation(`/feed/${feed.id}`)}
                              title={feed.description || feed.feed_name}
                            >
                              <BsStar size={18} className="flex-shrink-0" />
                              <span className="text-sm truncate">{feed.feed_name}</span>
                              {feed.user_role === 'owner' && (
                                <span className="text-xs text-gray-500 ml-auto">Owner</span>
                              )}
                              {feed.user_role === 'collaborator' && (
                                <span className="text-xs text-gray-500 ml-auto">Collab</span>
                              )}
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-400">
                          No content capsules yet
                        </div>
                      )}
                      <button className={communityItemClasses} onClick={() => setIsCreateFeedModalOpen(true)}>
                        <HiOutlinePlusCircle size={20} className="flex-shrink-0" />
                        <span className="text-sm">Create content capsule</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Mobile-only: Login button */}
              {!isDesktop && (
                <div className="px-2 mb-4 pb-4 border-b border-gray-800">
                  <button className={`${linkClasses} w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg justify-center`} onClick={() => {
                    setIsLoginFormOpen(true);
                    closeMobile();
                  }}>
                    <span>Login</span>
                  </button>
                </div>
              )}
              {/* Desktop: Login to see communities */}
              <div className={`px-3 py-4 ${!isExpanded && 'px-0 py-2 flex justify-center'} ${!isDesktop && 'hidden'}`}>
                <button className={linkClasses} onClick={() => setIsLoginFormOpen(true)}>
                  <HiOutlineUserGroup size={20} />
                  <span className={`${!isExpanded && 'hidden'}`}>Login to see groups</span>
                </button>
              </div>
            </>
          )}

          {/* Resources Section */}
          {isExpanded && (
            <div className="mt-auto pt-4 border-t border-gray-800">
              <div className="px-3 py-2">
                <span className={sectionTitleClasses}>Resources</span>
              </div>
              <div className="px-2">
                <button className={linkClasses} onClick={() => handleNavigation('/about')}>
                  <span className={`${!isExpanded && 'hidden'}`}>About Mockup</span>
                </button>
                <button className={linkClasses} onClick={() => handleNavigation('/help')}>
                  <span className={`${!isExpanded && 'hidden'}`}>Help</span>
                </button>
                <button className={linkClasses} onClick={() => handleNavigation('/settings')}>
                  <MdOutlineSettings size={20} className="flex-shrink-0" />
                  <span className={`${!isExpanded && 'hidden'}`}>Settings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateCommunityModalOpen}
        onClose={() => setIsCreateCommunityModalOpen(false)}
        onCreate={async (data) => {
          // Refresh communities list after creation
          if (isAuthenticated) {
            try {
              const communities = await api.getUserCommunities();
              setUserCommunities(communities || []);
            } catch (error) {
              console.error('Error refreshing communities:', error);
            }
          }
        }}
      />

      {/* Login Form Modal */}
      <Modal
        isOpen={isLoginFormOpen}
        onClose={() => {
          setIsLoginFormOpen(false);
          setIsSignUpMode(false);
        }}
        title={isSignUpMode ? "Sign Up" : "Login"}
      >
        {isSignUpMode ? (
          <SignUpForm 
            onSuccess={() => {
              setIsLoginFormOpen(false);
              setIsSignUpMode(false);
            }}
            onSwitchToLogin={() => setIsSignUpMode(false)}
          />
        ) : (
          <LoginForm 
            onSuccess={() => {
              setIsLoginFormOpen(false);
              setIsSignUpMode(false);
            }}
            onSwitchToSignUp={() => setIsSignUpMode(true)}
          />
        )}
      </Modal>

      {/* Create Feed Modal */}
      <CreateFeedModal
        isOpen={isCreateFeedModalOpen}
        onClose={() => setIsCreateFeedModalOpen(false)}
        onCreate={async (feedData) => {
          // Refresh feeds list after creation
          if (isAuthenticated) {
            try {
              const feeds = await api.getUserFeeds();
              setUserFeeds(feeds || []);
            } catch (error) {
              console.error('Error refreshing feeds:', error);
            }
          }
        }}
      />
    </>
  )
}

export default SideMenu
