const User = require('../models/User');
const UserAchievement = require('../models/UserAchievement');
const Notification = require('../models/Notification');
const cloudinary = require('cloudinary').v2;
const { extractPublicId } = require('../utils/urlHelper.js');
const { getIO, getUserSockets } = require('../config/socket');

/**
 * @desc    Get user info
 * @route   GET /api/users/:id(me if users' own profile)
 * @access  Public/Private
 * @isTested true
 */
const getUserProfile = async (req, res) => {
    try {
        let targetUserId = req.params.id || req.user?.id;
        const viewerId = req.user ? req.user.id : null;

        // If param is not a number, treat it as username
        if (targetUserId && isNaN(parseInt(targetUserId))) {
            const userByUsername = await User.findByUsername(targetUserId);
            if (!userByUsername) {
                return res.status(404).json({ message: "User not found" });
            }
            targetUserId = userByUsername.id;
        }

        const user = await User.getProfileWithStats(targetUserId, viewerId);

        if (!user) return res.status(404).json({ message: "User not found" });

        const achievements = await UserAchievement.getByUserId(targetUserId, 3);

        res.status(200).json({
            ...user,
            achievements
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Update profile picture URL
 * @route   PATCH /api/users/profile-picture
 * @access  Private
 * @isTested true
 */
const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'Profile picture file is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.profile_picture_url && user.profile_picture_url.includes('cloudinary')) {
            const publicId = extractPublicId(user.profile_picture_url);
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted old image: ${publicId}`);
        }

        const profile_picture_url = req.file.path;
        const updatedUser = await User.updatePicture(userId, profile_picture_url);

        res.status(200).json({
            message: 'Profile picture updated successfully',
            profile_picture_url: updatedUser.profile_picture_url
        });
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Follow a user
 * @route   POST /api/users/:id/follow
 * @access  Private
 * @isTested true
 */
const followUser = async (req, res) => {
    try{
        const followerId = req.user.id;
        const followingId = req.params.id;

        if(!followingId){
            return res.status(400).json({ message: 'Following user ID is required' });
        }

        // Don't allow users to follow themselves
        if (followerId === parseInt(followingId)) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const follow = await User.follow(followerId, followingId);
        
        // If follow was successful (not a duplicate), notify the followed user
        if (follow && followingId !== followerId) {
            try {
                const follower = await User.findById(followerId);
                
                if (follower) {
                    const notification = await Notification.create({
                        recipient_id: followingId,
                        sender_id: followerId,
                        type: 'USER_FOLLOWED',
                        entity_id: followingId,
                        comment_id: null
                    });

                    // Emit socket.io notification to the followed user if they're online
                    const io = getIO();
                    const userSockets = getUserSockets();
                    const socketId = userSockets.get(followingId.toString());
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            notification_id: notification.id,
                            recipient_id: followingId,
                            sender_id: followerId,
                            sender_username: follower.username,
                            sender_avatar: follower.profile_picture_url,
                            type: 'USER_FOLLOWED',
                            entity_id: followingId,
                            comment_id: null,
                            is_read: false,
                            created_at: notification.created_at
                        });
                    }
                }
            } catch (notifError) {
                console.error('Error sending follow notification:', notifError);
                // Don't fail the follow operation if notification fails
            }
        }
        
        res.status(200).json({ message: 'Successfully followed user', follow });
    }catch (error){
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/users/:id/unfollow
 * @access  Private
 * @isTested true
 */
const unfollowUser = async (req, res) => {
    try{
        const followerId = req.user.id;
        const followingId = req.params.id;

        if(!followingId){
            return res.status(400).json({ message: 'Following user ID is required' });
        }

        const unfollow = await User.unfollow(followerId, followingId);
        res.status(200).json({ message: 'Successfully unfollowed user', unfollow });
    }catch (error){
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Get followers list
 * @route   GET /api/users/:id/followers
 * @access  Public/Private
 * @isTested true
 */
const getFollowersList = async (req, res) => {
    try {
        const userId = req.params.id || req.user.id;
        const followers = await User.getFollowers(userId);
        res.status(200).json(followers);
    } catch (error) {
        console.error('Error fetching followers list:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Get following list
 * @route   GET /api/users/:id/following
 * @access  Public/Private
 * @isTested true
 */
const getFollowingList = async (req, res) => {
    try{
        const userId = req.params.id || req.user.id;
        const following = await User.getFollowing(userId);
        res.status(200).json(following);
    }catch (error){
        console.error('Error fetching following list:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    getUserProfile,
    updateProfilePicture,
    followUser,
    unfollowUser,
    getFollowersList,
    getFollowingList
};