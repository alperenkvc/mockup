import React, { useEffect, useRef } from 'react';
import { FaUser, FaUserEdit, FaTrophy, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ProfileExpandMenu = ({ isOpen, onClose, onViewProfile, onEditAvatar, onAchievements, onLogout, toggleButtonRef }) => {
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside the menu or on the toggle button
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        toggleButtonRef?.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, toggleButtonRef]);

  if (!isOpen) return null;

  const menuItems = [
    { icon: FaUser, label: 'View Profile', onClick: onViewProfile },
    { icon: FaUserEdit, label: 'Edit Avatar', onClick: onEditAvatar },
    { icon: FaTrophy, label: 'Achievements', onClick: onAchievements },
    { icon: FaSignOutAlt, label: 'Logout', onClick: onLogout, isLast: true },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors ${
              !item.isLast ? 'border-b border-gray-700' : ''
            }`}
          >
            <Icon className="text-gray-400" size={18} />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ProfileExpandMenu;

