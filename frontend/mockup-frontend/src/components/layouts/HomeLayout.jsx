import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import SideMenu from './SideMenu'
import SideContent from './SideContent'

const HomeLayout = ({ children }) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const hoverTimerRef = useRef(null);
  const clickTimestampRef = useRef(0);
  const location = useLocation();

  // Routes where SideContent should be hidden
  const hideSideContentRoutes = ['/manage-communities', '/create-post', '/signup', '/login'];
  const shouldShowSideContent = !hideSideContentRoutes.includes(location.pathname);

  const toggleSideMenu = () => {
    // Record click timestamp to prevent hover interference
    clickTimestampRef.current = Date.now();
    setIsPinned(!isPinned);
    // Clear hover state when toggling to prevent conflicts
    setIsHovering(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) {
        // On mobile, default to closed until explicitly opened
        setIsPinned(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop: show when pinned or hovering (flyout). Mobile: show only when pinned (acts as drawer)
  const showMenu = (isDesktop && (isPinned || isHovering)) || (!isDesktop && isPinned);

  return (
    <div className="bg-black text-white min-h-screen pt-[61px]">
      <Navbar toggleSideMenu={toggleSideMenu} isSideMenuExpanded={isPinned} />
      <div className="flex overflow-visible">
        <SideMenu 
          isExpanded={showMenu}
          isPinned={isPinned}
          isDesktop={isDesktop}
          togglePin={toggleSideMenu}
          onMouseEnter={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => {
              setIsHovering(true);
              hoverTimerRef.current = null;
            }, 700);
          }}
          onMouseLeave={() => {
            // Ignore mouse leave if we just clicked (within 200ms)
            if (Date.now() - clickTimestampRef.current < 200) {
              return;
            }
            if (hoverTimerRef.current) {
              clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = null;
            }
            setIsHovering(false);
          }}
          closeMobile={() => setIsPinned(false)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out overflow-x-hidden`}>
          <div className={`flex gap-4 p-4 max-w-7xl mx-auto ${shouldShowSideContent ? '' : 'justify-center'} overflow-x-hidden`}>
            {/* Content area - accepts children from page components */}
            <div className={`${shouldShowSideContent ? 'flex-1 min-w-0' : 'w-full max-w-4xl'} overflow-x-hidden`}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default HomeLayout
