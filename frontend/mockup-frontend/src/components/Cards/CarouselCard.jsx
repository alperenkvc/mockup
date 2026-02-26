import React from 'react'

//This is the section on top of the popular page that has horizontal scrolling cards

const CarouselCard = ({ title, community }) => (
  <button className='cursor-pointer hover:bg-gray-800 transition duration-300 rounded-lg'>
    <div className="flex-shrink-0 w-80 h-32 bg-transparent border border-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
      <div className="font-semibold text-lg text-white line-clamp-2 leading-tight">{title}</div> 
      <div className="text-sm text-gray-500 mt-1">{community}</div>
    </div>
  </button>
)

export default CarouselCard
