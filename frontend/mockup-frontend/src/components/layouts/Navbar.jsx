import React, { useState, useRef } from 'react';
import { HiOutlineMenu } from 'react-icons/hi';
import SearchBar from '../SearchBar';
import Modal from '../Modal';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../Auth/LoginForm';
import SignUpForm from '../Auth/SignUpForm';
import { useNavigate } from 'react-router-dom';
import ProfileExpandMenu from './ProfileExpandMenu';
import UpdatePictureModal from '../CustomModals/UpdatePictureModal';
import NotificationBox from '../Notifications/NotificationBox';
const Navbar = ({ toggleSideMenu, isSideMenuExpanded }) => {
  const navigate = useNavigate();
  const handleNavigation = (path) => {
    navigate(path);
  }

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUpdatePictureModalOpen, setIsUpdatePictureModalOpen] = useState(false);
  const profileToggleButtonRef = useRef(null);
  const { user, logout, isAuthenticated } = useAuth();

  const desktop = window.innerWidth >= 1024;

  return (
    <nav className="bg-black text-white p-4 flex items-center justify-between fixed top-0 w-full z-50 h-[61px] border-b border-gray-700">
      <div className="flex items-center gap-4">
        {/* Hamburger menu icon (hidden on desktop) */}
        <button
          onClick={toggleSideMenu}
          className="lg:hidden text-white focus:outline-none p-2 rounded-full hover:bg-gray-700"
        >
          <HiOutlineMenu size={24} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">mockup</span>
        </div>
      </div>

      <SearchBar />

      <div className='flex items-center gap-2'>
        {isAuthenticated && <div className="hidden lg:block"><NotificationBox /></div>}
        {isAuthenticated ? (
          <>
            {/* Profile menu and Create button - hidden on mobile, shown on desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="relative">
                <button 
                  ref={profileToggleButtonRef}
                  className="cursor-pointer text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2" 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  {user?.username}
                  <svg 
                    className={`w-4 h-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <ProfileExpandMenu
                  isOpen={isProfileMenuOpen}
                  onClose={() => setIsProfileMenuOpen(false)}
                  toggleButtonRef={profileToggleButtonRef}
                  onViewProfile={() => {
                    setIsProfileMenuOpen(false);
                    handleNavigation(`/user/${user?.username}`);
                  }}
                  onEditAvatar={() => {
                    setIsProfileMenuOpen(false);
                    setIsUpdatePictureModalOpen(true);
                  }}
                  onAchievements={() => {
                    setIsProfileMenuOpen(false);
                    handleNavigation('/achievements');
                  }}                
                  onLogout={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                />
              </div>
              <button className='btn-primary' onClick={() => handleNavigation("/submit")}>Create</button>
            </div>
          </>
        ) : (
          <button className='hidden lg:block btn-secondary' onClick={() => setIsLoginModalOpen(true)}>Login</button>
        )}
      </div>

      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setIsSignUpMode(false);
        }}
        title={isSignUpMode ? "Sign Up" : "Login"}
      >
        {isSignUpMode ? (
          <SignUpForm 
            onSuccess={() => {
              setIsLoginModalOpen(false);
              setIsSignUpMode(false);
            }}
            onSwitchToLogin={() => setIsSignUpMode(false)}
          />
        ) : (
          <LoginForm 
            onSuccess={() => {
              setIsLoginModalOpen(false);
              setIsSignUpMode(false);
            }}
            onSwitchToSignUp={() => setIsSignUpMode(true)}
          />
        )}
      </Modal>

      <UpdatePictureModal
        isOpen={isUpdatePictureModalOpen}
        onClose={() => setIsUpdatePictureModalOpen(false)}
        type="user"
        onSuccess={() => {
          // Optionally refresh user data or show success message
        }}
      />
    </nav>
  );
};

export default Navbar