const express = require('express');
const router = express.Router();
const { getAllCommunities, getUserCommunities, createCommunity, updateCommunity, updateCommunityPicture, joinCommunity, leaveCommunity, setMemberStatus, setMemberRole, getCommunityMembers, getCommunityByName, getCommunityFeed, getApprovedMemberCount, getPendingMembers } = require('../controllers/communityController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {isModerator} =  require('../middleware/communityAuthMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', optionalProtect, getAllCommunities);
router.get('/name/:name', optionalProtect, getCommunityByName);
router.get('/my-communities', protect, getUserCommunities);
router.post('/create', protect, upload.single('community_picture_url'), createCommunity);
router.post('/:id/join', protect, joinCommunity);
router.post('/:id/leave', protect, leaveCommunity);
router.patch('/:id/members/:userId/status', protect, isModerator, setMemberStatus);
router.patch('/:id/members/:userId/role', protect, isModerator, setMemberRole);
router.get('/:id/approved-members', optionalProtect, getCommunityMembers);
router.get('/:id/feed', optionalProtect, getCommunityFeed);
router.get('/:id/approved-members/count', optionalProtect, getApprovedMemberCount);
router.get('/:id/pending-members', protect, isModerator, getPendingMembers);
router.put('/:id', protect, isModerator, upload.single('community_picture_url'), updateCommunity);
router.patch('/:id/picture', protect, isModerator, upload.single('community_picture_url'), updateCommunityPicture);


module.exports = router;
