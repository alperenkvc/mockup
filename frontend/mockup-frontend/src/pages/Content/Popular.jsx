import React from 'react'
import PostCard from '../../components/Cards/PostCard'
import HorizontalScrollSection from '../../components/layouts/HorizontalScrollSection'
import SideContent from '../../components/layouts/SideContent'

const Popular = () => {
  return (
    <>
      {/* HorizontalScrollSection at the top */}
      <div className="mb-6 w-full overflow-x-hidden">
        <HorizontalScrollSection />
      </div>

      {/* Flex container for Popular Posts and Sidebar */}
      <div className='flex flex-wrap gap-6 items-start'>
        {/* Popular Posts container */}
        <div className="flex-grow min-w-0">
          <h2 className="text-lg font-semibold mb-4">Popular Posts</h2>
          <PostCard />
          <PostCard />
        </div>

        {/* SideContent on the right */}
        <aside className="hidden lg:block lg:w-80 flex-shrink-0">
          <div className="sticky top-10">
            <SideContent header="Popular Groups" />
          </div>
        </aside>
      </div>
    </>
  )
}

export default Popular

