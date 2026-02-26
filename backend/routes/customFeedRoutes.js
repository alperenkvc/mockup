const express = require('express');
const router = express.Router();
const { createFeed, toggleLikeFeed, joinCollaboration, addCommunityToFeed, handleCollabRequest, deleteFeed, removeCollaboratorFromFeed, checkIfUserIsCollaborator, getFeedCollaborators, removeCommunityFromFeed, getUserFeeds, getFeedById, getFeedPosts, quitCollaboration, updateFeed, getPendingRequests } = require('../controllers/customFeedController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.get('/my-feeds', protect, getUserFeeds);
router.get('/:feedId', protect, getFeedById);
router.get('/:feedId/posts', protect, getFeedPosts);
router.post('/create', protect, createFeed);
router.put('/:feedId', protect, updateFeed);
router.post('/:feedId/toggle-like', protect, toggleLikeFeed);
router.post('/:feedId/join-collaboration', protect, joinCollaboration);
router.post('/:feedId/quit-collaboration', protect, quitCollaboration);
router.post('/:feedId/add-community/:communityId', protect, addCommunityToFeed);
router.post('/:feedId/remove-community/:communityId', protect, removeCommunityFromFeed);
router.post('/:feedId/collaboration-request/:userId', protect, handleCollabRequest);
router.delete('/:feedId/delete', protect, deleteFeed);
router.delete('/:feedId/remove-collaborator/:userId', protect, removeCollaboratorFromFeed);
router.get('/:feedId/check-collaborator/:userId', protect, checkIfUserIsCollaborator);
router.get('/:feedId/collaborators', protect, getFeedCollaborators);
router.get('/:feedId/pending-requests', protect, getPendingRequests);

module.exports = router;