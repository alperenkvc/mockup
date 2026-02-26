const express = require('express');
const router = express.Router();
const { getUserProfile, updateProfilePicture, followUser, unfollowUser, getFollowersList, getFollowingList} = require('../controllers/userController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/me', protect, getUserProfile);
router.get('/:id', optionalProtect, getUserProfile);
router.patch('/profile-picture', protect, upload.single('profile_picture_url'), updateProfilePicture);
router.post('/:id/follow', protect, followUser);
router.delete('/:id/unfollow', protect, unfollowUser);
router.get('/:id/followers', optionalProtect, getFollowersList);
router.get('/:id/following', optionalProtect, getFollowingList);

module.exports = router;

