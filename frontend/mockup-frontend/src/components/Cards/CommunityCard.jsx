import React from 'react'

const CommunityCard = ({ 
  name,
  pfp,
  description,
  memberCount,
  isJoined,
  onClick,
  onLeave,
  rank,
  compact = false
}) => {
  const cardPadding = compact ? 'p-3 py-4' : 'p-4';
  const cardMargin = compact ? 'mb-0' : 'mb-4';
  const imageSize = compact ? 'w-8 h-8' : 'w-10 h-10';
  const titleSize = compact ? 'text-sm' : 'text-lg';
  const descriptionSize = compact ? 'text-xs' : 'text-sm';
  const memberSize = compact ? 'text-xs' : 'text-xs';
  const rankSize = compact ? 'text-xs' : 'text-sm';
  const buttonSize = compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div 
      className={`bg-black rounded-lg ${cardPadding} ${cardMargin} border border-black ${compact ? 'min-h-[80px]' : ''}`}
    >
      <div className={`flex items-start ${compact ? 'gap-2' : 'justify-between gap-3'}`}>
        {/* Rank number */}
        {rank && (
          <div className="flex-shrink-0 w-5 flex items-start justify-center pt-0.5">
            <span className={`text-gray-500 font-semibold ${rankSize}`}>{rank}</span>
          </div>
        )}

        {/* Card content - clickable */}
        <div 
          className="flex-1 flex items-start gap-2 min-w-0"
          onClick={onClick}
        >
          <img src={pfp} alt={name} className={`${imageSize} rounded-full flex-shrink-0`} />
          <div className="flex flex-col flex-1 min-w-0">
            <span className={`${titleSize} cursor-pointer hover:text-green-500 transition-colors font-semibold mb-1 ${compact ? 'break-words' : 'truncate'} inline-block w-fit`}>{name}</span>
            {description && (
              <p className={`${descriptionSize} text-gray-300 ${compact ? 'truncate mb-1' : 'line-clamp-2 mb-2'}`}>{description}</p>
            )}
            <span className={`${memberSize} text-gray-500`}>{memberCount} members</span>
          </div>
        </div>

        {/* Joined button - hidden in compact mode */}
        {isJoined && !compact && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card onClick from firing
              if (onLeave) {
                onLeave();
              }
            }}
            className={`flex-shrink-0 ${buttonSize} bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-full transition-colors cursor-pointer`}
          >
            Joined
          </button>
        )}
      </div>
    </div>
  )
}

export default CommunityCard