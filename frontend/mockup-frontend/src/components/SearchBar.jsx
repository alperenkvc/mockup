import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import { HiUser, HiUserGroup, HiCollection } from 'react-icons/hi'
import { api } from '../utils/api'

const SearchBar = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  const desktopClass = "w-120 flex items-center rounded-2xl px-4 bg-gray-800/80 hover:bg-gray-800 transition ease-in-out relative"
  const mobileClass = "w-120 flex items-center rounded-2xl px-4 bg-gray-800/80 hover:bg-gray-800 transition ease-in-out mx-4 relative"

  const isDesktop = window.innerWidth >= 1024

  // Debounce search
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const searchResults = await api.search(searchTerm.trim())
        setResults(searchResults || [])
        setShowResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleResultClick = (result) => {
    setSearchTerm('')
    setShowResults(false)
    
    if (result.type === 'User') {
      navigate(`/user/${result.display_name}`)
    } else if (result.type === 'Community' || result.type === 'Group') {
      navigate(`/r/${encodeURIComponent(result.display_name)}`)
    } else if (result.type === 'Custom Feed' || result.type === 'Content Capsule') {
      navigate(`/feed/${result.id}`)
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'User':
        return <HiUser className="text-gray-400" size={18} />
      case 'Community':
      case 'Group':
        return <HiUserGroup className="text-gray-400" size={18} />
      case 'Custom Feed':
      case 'Content Capsule':
        return <HiCollection className="text-gray-400" size={18} />
      default:
        return null
    }
  }

  return (
    <div ref={searchRef} className={isDesktop ? desktopClass : mobileClass}>
      <FaMagnifyingGlass className='text-gray-400' />
      <input
        ref={inputRef}
        type='text'
        placeholder='Search on Mockup'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => {
          if (results.length > 0) {
            setShowResults(true)
          }
        }}
        className='flex-1 px-2 py-1 bg-transparent outline-none text-white placeholder-gray-400'
      />
      
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-gray-400 text-sm">Searching...</div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {result.display_name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {result.type === 'Community' ? 'Group' : result.type === 'Custom Feed' ? 'Content Capsule' : result.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.trim().length >= 2 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">No results found</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default SearchBar
