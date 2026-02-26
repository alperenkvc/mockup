import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Extract error message from response
    const message = error.response?.data?.message || 
                    error.response?.data?.error || 
                    error.message || 
                    'An error occurred';
    
    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // You can add redirect logic here if needed
    }
    
    return Promise.reject(new Error(message));
  }
);

// API methods
export const api = {
  // Auth endpoints
  login: async (email, password) => {
    return apiClient.post('/auth/login', { email, password });
  },

  register: async (userData) => {
    return apiClient.post('/auth/register', userData);
  },

  // User endpoints
  getProfile: async () => {
    return apiClient.get('/users/me');
  },

  getUserProfileByUsername: async (username) => {
    return apiClient.get(`/users/${username}`);
  },

  followUser: async (userId) => {
    return apiClient.post(`/users/${userId}/follow`);
  },

  unfollowUser: async (userId) => {
    return apiClient.delete(`/users/${userId}/unfollow`);
  },

  getFollowers: async (userId) => {
    return apiClient.get(`/users/${userId}/followers`);
  },

  getFollowing: async (userId) => {
    return apiClient.get(`/users/${userId}/following`);
  },

  updateProfile: async (userData) => {
    return apiClient.put('/users/profile', userData);
  },

  updateProfilePicture: async (formData) => {
    return apiClient.patch('/users/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteProfile: async () => {
    return apiClient.delete('/users/profile');
  },

  // Posts endpoints
  getFeed: async () => {
    return apiClient.get('/posts/feed');
  },

  getPostById: async (postId, includeDeleted = false) => {
    return apiClient.get(`/posts/${postId}`, {
      params: includeDeleted ? { includeDeleted: 'true' } : {}
    });
  },

  createPost: async (formData, type = 'text') => {
    return apiClient.post(`/posts/submit?type=${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  votePost: async (postId, voteValue) => {
    return apiClient.post(`/posts/${postId}/vote`, { vote_value: voteValue });
  },

  votePoll: async (postId, optionId) => {
    return apiClient.post(`/posts/${postId}/poll-vote`, { optionId });
  },

  deletePost: async (postId) => {
    return apiClient.delete(`/posts/${postId}`);
  },

  toggleSavePost: async (postId) => {
    return apiClient.post(`/posts/${postId}/toggle-save`);
  },

  getSavedPosts: async (limit = 20, offset = 0) => {
    return apiClient.get('/posts/saved', { params: { limit, offset } });
  },

  getDrafts: async () => {
    return apiClient.get('/posts/drafts');
  },

  getPostsByUser: async (userId, limit = 20, offset = 0) => {
    return apiClient.get(`/posts/user/${userId}`, { params: { limit, offset } });
  },

  // Community endpoints
  getAllCommunities: async () => {
    return apiClient.get('/communities');
  },

  getCommunityByName: async (communityName) => {
    // URL encode the community name to handle special characters like "/" in names starting with "r/"
    const encodedName = encodeURIComponent(communityName);
    return apiClient.get(`/communities/name/${encodedName}`);
  },

  getCommunityFeed: async (communityId) => {
    return apiClient.get(`/communities/${communityId}/feed`);
  },

  getUserCommunities: async () => {
    return apiClient.get('/communities/my-communities');
  },

  joinCommunity: async (communityId) => {
    return apiClient.post(`/communities/${communityId}/join`);
  },

  leaveCommunity: async (communityId) => {
    return apiClient.post(`/communities/${communityId}/leave`);
  },

  getCommunityMembers: async (communityId) => {
    return apiClient.get(`/communities/${communityId}/approved-members`);
  },

  createCommunity: async (communityData) => {
    return apiClient.post('/communities/create', communityData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateCommunityPicture: async (communityId, formData) => {
    return apiClient.patch(`/communities/${communityId}/picture`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Comment endpoints
  getComments: async (postId) => {
    return apiClient.get(`/posts/${postId}/comments`);
  },

  addComment: async (postId, commentData) => {
    // If commentData is FormData, send with multipart/form-data header
    if (commentData instanceof FormData) {
      return apiClient.post(`/posts/${postId}/comment`, commentData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    // Otherwise send as JSON
    return apiClient.post(`/posts/${postId}/comment`, commentData);
  },

  voteComment: async (commentId, voteValue) => {
    return apiClient.post(`/comments/${commentId}/vote`, { vote_value: voteValue });
  },

  updateComment: async (commentId, content) => {
    return apiClient.patch(`/comments/${commentId}`, { content });
  },

  deleteComment: async (commentId) => {
    return apiClient.delete(`/comments/${commentId}`);
  },

  getCommentsByUser: async (userId, limit = 20, offset = 0) => {
    return apiClient.get(`/comments/user/${userId}`, { params: { limit, offset } });
  },

  // Content Capsule endpoints
  createFeed: async (feedData) => {
    return apiClient.post('/custom-feeds/create', feedData);
  },

  getUserFeeds: async () => {
    return apiClient.get('/custom-feeds/my-feeds');
  },

  getFeedById: async (feedId) => {
    return apiClient.get(`/custom-feeds/${feedId}`);
  },

  getFeedPosts: async (feedId) => {
    return apiClient.get(`/custom-feeds/${feedId}/posts`);
  },

  toggleLikeFeed: async (feedId) => {
    return apiClient.post(`/custom-feeds/${feedId}/toggle-like`);
  },

  deleteFeed: async (feedId) => {
    return apiClient.delete(`/custom-feeds/${feedId}/delete`);
  },

  addCommunityToFeed: async (feedId, communityId) => {
    return apiClient.post(`/custom-feeds/${feedId}/add-community/${communityId}`);
  },

  removeCommunityFromFeed: async (feedId, communityId) => {
    return apiClient.post(`/custom-feeds/${feedId}/remove-community/${communityId}`);
  },

  joinCollaboration: async (feedId) => {
    return apiClient.post(`/custom-feeds/${feedId}/join-collaboration`);
  },

  quitCollaboration: async (feedId) => {
    return apiClient.post(`/custom-feeds/${feedId}/quit-collaboration`);
  },

  getFeedCollaborators: async (feedId) => {
    return apiClient.get(`/custom-feeds/${feedId}/collaborators`);
  },

  getPendingRequests: async (feedId) => {
    return apiClient.get(`/custom-feeds/${feedId}/pending-requests`);
  },

  handleCollabRequest: async (feedId, userId, action) => {
    return apiClient.post(`/custom-feeds/${feedId}/collaboration-request/${userId}`, { action });
  },

  // Search endpoints
  search: async (query) => {
    return apiClient.get('/search', { params: { q: query } });
  },

  // Notification endpoints
  getNotifications: async (limit = 20) => {
    return apiClient.get('/notifications', { params: { limit } });
  },

  getUnreadCount: async () => {
    return apiClient.get('/notifications/unread-count');
  },

  markNotificationAsRead: async (notificationId) => {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  },

  markAllNotificationsAsRead: async () => {
    return apiClient.patch('/notifications/mark-all-read');
  },

  // Update endpoints
  updateFeed: async (feedId, feedData) => {
    return apiClient.put(`/custom-feeds/${feedId}`, feedData);
  },

  updateCommunity: async (communityId, communityData) => {
    return apiClient.put(`/communities/${communityId}`, communityData);
  },

  // Moderator actions
  moderatorDeletePost: async (postId, reason) => {
    return apiClient.delete(`/posts/${postId}/moderator-delete`, {
      data: { reason }
    });
  },

  banUserFromCommunity: async (communityId, userId) => {
    return apiClient.patch(`/communities/${communityId}/members/${userId}/status`, {
      status: 'banned'
    });
  },
};

export default api;
