import React from 'react'
import { useNavigate } from 'react-router-dom'

const SideContent = ({header, stats, achievements}) => {
    const navigate = useNavigate()
    return (
        <div className="bg-black rounded-lg border border-black p-4 hover:border-gray-700 transition-colors">
            <h2 className="text-lg font-semibold mb-4">{header}</h2>
            <div className="space-y-6">
                {/* Stats Section */}
                {stats && (
                    <div className="space-y-4">
                        {stats.followers !== undefined && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Followers</p>
                                {stats.onFollowersClick ? (
                                    <button
                                        onClick={stats.onFollowersClick}
                                        className="text-lg font-semibold text-white hover:text-green-500 transition-colors cursor-pointer"
                                    >
                                        {Number(stats.followers).toLocaleString()}
                                    </button>
                                ) : (
                                    <p className="text-lg font-semibold text-white">{Number(stats.followers).toLocaleString()}</p>
                                )}
                            </div>
                        )}
                        {stats.following !== undefined && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Following</p>
                                {stats.onFollowingClick ? (
                                    <button
                                        onClick={stats.onFollowingClick}
                                        className="text-lg font-semibold text-white hover:text-green-500 transition-colors cursor-pointer"
                                    >
                                        {Number(stats.following).toLocaleString()}
                                    </button>
                                ) : (
                                    <p className="text-lg font-semibold text-white">{Number(stats.following).toLocaleString()}</p>
                                )}
                            </div>
                        )}
                        {stats.karma !== undefined && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Karma</p>
                                <p className="text-lg font-semibold text-white">{Number(stats.karma).toLocaleString()}</p>
                            </div>
                        )}
                        {stats.contributions !== undefined && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Contributions</p>
                                <p className="text-lg font-semibold text-white">{Number(stats.contributions).toLocaleString()}</p>
                            </div>
                        )}
                        {stats.members !== undefined && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Members</p>
                                <p className="text-lg font-semibold text-white">{Number(stats.members).toLocaleString()}</p>
                            </div>
                        )}
                        {stats.posts !== undefined && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Posts</p>
                                <p className="text-lg font-semibold text-white">{Number(stats.posts).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Achievements Section */}
                {achievements && achievements.length > 0 && (
                    <div className="pt-4 border-t border-gray-800">
                        <h3 className="text-sm font-semibold text-white mb-3">Achievements</h3>
                        <div className="space-y-2">
                            {achievements.map((achievement, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="text-lg">{achievement.icon || '🏆'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium">{achievement.name}</p>
                                        {achievement.description && (
                                            <p className="text-xs text-gray-400">{achievement.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => navigate('/achievements')}
                            className="mt-3 w-full btn-primary"
                        >
                            View all
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}

export default SideContent
