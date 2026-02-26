const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('cloudinary').v2;
const { extractPublicId } = require('../utils/urlHelper');
const { getIO, getUserSockets } = require('../config/socket');

/**
 * @desc    Create a new community
 * @route   POST /api/communities/create
 * @access  Private
 * @isTested true
 */
const createCommunity = async (req, res) => {
    try {
        const {
            community_name,
            description,
            type, // public, private, restricted 
        } = req.body;

        const community_picture_url = req.file ? req.file.path : null;

        const creator_id = req.user.id;

        if (!community_name || !description || !type) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        if (type !== 'public' && type !== 'private' && type !== 'restricted') {
            return res.status(400).json({ message: 'Invalid community type' });
        }
        const community = await Community.create({ community_name, description, type, community_picture_url, creator_id });
        if (!community) {
            return res.status(404).json({ message: 'Community not created' });
        }
        res.status(201).json(community);
    } catch (error) {
        console.error('Error creating community:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Update a community
 * @route   PUT /api/communities/:id
 * @access  Moderator/Admin
 * @isTested true
 */
const updateCommunity = async (req, res) => {
    try {
        const community_id = req.params.id;

        const community = await Community.findById(community_id);
        if (!community) return res.status(404).json({ message: 'Community not found' });

        const { community_name, description, type } = req.body;

        const community_picture_url = req.file ? req.file.path : community.community_picture_url;

        const updatedCommunity = await Community.update(community_id, {
            community_name,
            description,
            type,
            community_picture_url
        });

        res.status(200).json(updatedCommunity);
    } catch (error) {
        console.error('Error updating community:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
/**
 * @desc    Get all communities
 * @route   GET /api/communities
 * @access  Public
 * @isTested true
 */
const getAllCommunities = async (req, res) => {
    try {
        const communities = await Community.getAll();
        if (!communities) {
            return res.status(404).json({ message: 'No communities found' });
        }
        res.status(200).json(communities);
    } catch (error) {
        console.error('Error fetching communities:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Get communities that the authenticated user is a member of
 * @route   GET /api/communities/my-communities
 * @access  Private
 * @isTested true
 */
const getUserCommunities = async (req, res) => {
    try {
        const userId = req.user.id;
        const communities = await CommunityMember.getCommunitiesByUser(userId);
        res.status(200).json(communities);
    } catch (error) {
        console.error('Error fetching user communities:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/** * @desc    Join a community
 * @route   POST /api/communities/:id/join
 * @access  Private
 * @isTested true
 */
const joinCommunity = async (req, res) => {
    try {
        const userId = req.user.id;
        const communityId = req.params.id;

        const result = await CommunityMember.join(userId, communityId);

        if (result.error) {
            if (result.error === 'banned') {
                return res.status(403).json({ message: 'You are banned from this community' });
            }
            if (result.error === 'already_pending') {
                return res.status(409).json({ message: 'Your membership is already pending approval' });
            }
            return res.status(409).json({ message: 'You are already a member of this community' });
        }

        // Notify moderators when a user joins the community
        try {
            const moderators = await CommunityMember.getModerators(communityId);
            const community = await Community.findById(communityId);
            
            if (moderators && moderators.length > 0 && community) {
                const io = getIO();
                const userSockets = getUserSockets();
                
                for (const moderatorId of moderators) {
                    if (moderatorId === userId) continue;
                    
                    const notification = await Notification.create({
                        recipient_id: moderatorId,
                        sender_id: userId,
                        type: 'MEMBER_JOINED',
                        entity_id: communityId,
                        comment_id: null
                    });

                    const socketId = userSockets.get(moderatorId.toString());
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            notification_id: notification.id,
                            recipient_id: moderatorId,
                            sender_id: userId,
                            sender_username: req.user.username,
                            sender_avatar: req.user.profile_picture_url,
                            type: 'MEMBER_JOINED',
                            entity_id: communityId,
                            comment_id: null,
                            is_read: false,
                            created_at: notification.created_at
                        });
                    }
                }
            }
        } catch (notifError) {
            console.error('Error sending join notifications to moderators:', notifError);
        }

        const message = result.status === 'approved' ? 'Successfully joined the community' : 'Membership request is pending approval';

        return res.status(200).json({ message, memberData: result.data });
    } catch (error) {
        console.error('Error joining community:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Leave a community
 * @route   DELETE /api/communities/:id/leave
 * @access  Private
 * @isTested true
 */
const leaveCommunity = async (req, res) => {
    try {
        const userId = req.user.id;
        const communityId = req.params.id;

        const result = await CommunityMember.leave(userId, communityId);

        if (!result) {
            return res.status(404).json({ message: 'You are not a member of this community' });
        }

        return res.status(200).json({ message: 'Successfully left the community' });
    } catch (error) {
        console.error('Error leaving community:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Set a member's status in a community
 * @route   PATCH /api/communities/:id/members/:userId/status
 * @access  Moderator/Admin
 * @isTested true
 */
const setMemberStatus = async (req, res) => {
    try {
        const communityId = req.params.id;     // The Community
        const targetUserId = req.params.userId; // The person being updated
        const { status } = req.body;            // The new status (pending, approved, banned)

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        // Logic check: A moderator shouldn't be able to ban themselves
        if (req.user.id === parseInt(targetUserId)) {
            return res.status(400).json({ message: 'You cannot change your own status' });
        }

        // Get the previous status to check if it was pending
        const previousMember = await CommunityMember.getMemberStatus(targetUserId, communityId);
        const wasPending = previousMember && previousMember.status === 'pending';

        const result = await CommunityMember.setStatus(targetUserId, communityId, status);

        if (!result) {
            return res.status(404).json({ message: 'Member not found in this community' });
        }

        // Notify the requester if their pending request was approved
        if (wasPending && status === 'approved' && targetUserId !== req.user.id) {
            try {
                const community = await Community.findById(communityId);
                const moderator = await User.findById(req.user.id);
                
                if (community && moderator) {
                    const notification = await Notification.create({
                        recipient_id: targetUserId,
                        sender_id: req.user.id,
                        type: 'MEMBERSHIP_APPROVED',
                        entity_id: communityId,
                        comment_id: null
                    });

                    // Emit socket.io notification to the requester if they're online
                    const io = getIO();
                    const userSockets = getUserSockets();
                    const socketId = userSockets.get(targetUserId.toString());
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            notification_id: notification.id,
                            recipient_id: targetUserId,
                            sender_id: req.user.id,
                            sender_username: moderator.username,
                            sender_avatar: moderator.profile_picture_url,
                            type: 'MEMBERSHIP_APPROVED',
                            entity_id: communityId,
                            comment_id: null,
                            is_read: false,
                            created_at: notification.created_at
                        });
                    }
                }
            } catch (notifError) {
                console.error('Error sending approval notification:', notifError);
                // Don't fail the status update if notification fails
            }
        }

        return res.status(200).json({
            message: `User status updated to ${status}`,
            memberData: result
        });
    } catch (error) {
        console.error('Error setting member status:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Set a member's role in a community
 * @route   PATCH /api/communities/:id/members/:userId/role
 * @access  Moderator/Admin
 * @isTested true
 */
const setMemberRole = async (req, res) => {
    try {
        const communityId = req.params.id;
        const targetUserId = req.params.userId;
        const { community_role: role } = req.body;

        if (!role) {
            return res.status(400).json({ message: 'Role is required' });
        }

        // Prevent assigning moderator role to banned users
        if (role === 'moderator') {
            // Check if user is globally banned
            const isBanned = await User.isBanned(targetUserId);
            if (isBanned === null) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (isBanned) {
                return res.status(403).json({ message: 'Cannot assign moderator role to a banned user' });
            }

            // Check if user is banned from this community
            const isBannedFromCommunity = await CommunityMember.isBannedFromCommunity(targetUserId, communityId);
            if (isBannedFromCommunity) {
                return res.status(403).json({ message: 'Cannot assign moderator role to a user banned from this community' });
            }
        }

        // Get the previous role to check if user was promoted to moderator
        const previousMember = await CommunityMember.getMemberRole(targetUserId, communityId);
        const wasPromotedToModerator = previousMember && 
                                       previousMember.community_role !== 'moderator' && 
                                       role === 'moderator';

        const result = await CommunityMember.setRole(targetUserId, communityId, role);

        if (!result) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Notify the user if they were promoted to moderator
        if (wasPromotedToModerator && targetUserId !== req.user.id) {
            try {
                const community = await Community.findById(communityId);
                const promoter = await User.findById(req.user.id);
                
                if (community && promoter) {
                    const notification = await Notification.create({
                        recipient_id: targetUserId,
                        sender_id: req.user.id,
                        type: 'MODERATOR_PROMOTED',
                        entity_id: communityId,
                        comment_id: null
                    });

                    // Emit socket.io notification to the promoted user if they're online
                    const io = getIO();
                    const userSockets = getUserSockets();
                    const socketId = userSockets.get(targetUserId.toString());
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            notification_id: notification.id,
                            recipient_id: targetUserId,
                            sender_id: req.user.id,
                            sender_username: promoter.username,
                            sender_avatar: promoter.profile_picture_url,
                            type: 'MODERATOR_PROMOTED',
                            entity_id: communityId,
                            comment_id: null,
                            is_read: false,
                            created_at: notification.created_at
                        });
                    }
                }
            } catch (notifError) {
                console.error('Error sending moderator promotion notification:', notifError);
                // Don't fail the role update if notification fails
            }
        }

        res.status(200).json({ message: 'Role updated successfully', data: result });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
* @desc    Get all approved members of a community with user information
* @route   GET /api/communities/:id/approved-members
* @access  Public/Private
* @isTested true
*/
const getCommunityMembers = async (req, res) => {
    try {
        const communityId = req.params.id;
        const members = await CommunityMember.getMembers(communityId, 'approved');

        // Return empty array if no members found (this is valid)
        return res.status(200).json(members || []);
    } catch (error) {
        console.error('Error getting community members:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Get community by name with member info
 * @route   GET /api/communities/name/:name
 * @access  Public/Private
 * @isTested true
 */
const getCommunityByName = async (req, res) => {
    try {
        // Decode the community name to handle URL-encoded names (e.g., "r%2Ftest" -> "r/test")
        const communityName = decodeURIComponent(req.params.name);
        const requestingUserId = req.user ? req.user.id : null;

        const community = await Community.getByNameWithMemberInfo(communityName, requestingUserId);

        if (!community) {
            return res.status(404).json({ message: 'Community not found' });
        }

        // Transform the response to include is_joined flag
        const response = {
            ...community,
            is_joined: community.user_membership_status === 'approved',
            is_moderator: community.user_role === 'moderator'
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error('Error getting community by name:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Get community feed
 * @route   GET /api/communities/:id/feed
 * @access  Public/Private
 * @isTested true
 */
const getCommunityFeed = async (req, res) => {
    try {
        const communityId = req.params.id;
        const requestingUserId = req.user ? req.user.id : null;

        const feed = await Community.getCommunityFeed(communityId, requestingUserId);

        if (!feed) {
            return res.status(500).json({ message: 'Internal error fetching feed' });
        }

        return res.status(200).json(feed);
    } catch (error) {
        console.error('Error getting community feed:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/** 
 * @desc    Get approved member count of a community
 * @route   GET /api/communities/:id/approved-members/count
 * @access  Public
 * @isTested true
 */
const getApprovedMemberCount = async (req, res) => {
    try {
        const communityId = req.params.id;
        const count = await CommunityMember.getMemberCount(communityId);

        if (!count) {
            return res.status(404).json({ message: 'Community not found or no approved members' });
        }

        return res.status(200).json({message: 'Approved member count retrieved', count});
    } catch (error) {
        console.error('Error getting approved member count:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/** 
 * @desc    Get pending members of a community
 * @route   GET /api/communities/:id/pending-members
 * @access  Moderator/Admin
 * @isTested true
 */
const getPendingMembers = async (req, res) => {
    try {
        const communityId = req.params.id;
        const pendingMembers = await CommunityMember.getPendingMembers(communityId);

        // Return empty array if no pending members (this is valid)
        return res.status(200).json(pendingMembers || []);
    } catch (error) {
        console.error('Error getting pending members:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

/**
 * @desc    Update community profile picture
 * @route   PATCH /api/communities/:id/picture
 * @access  Moderator/Admin
 * @isTested true
 */
const updateCommunityPicture = async (req, res) => {
    try {
        const communityId = req.params.id;

        const community = await Community.findById(communityId);
        if (!community) {
            return res.status(404).json({ message: 'Community not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Community picture file is required' });
        }

        // Delete old picture if exists
        if (community.community_picture_url && community.community_picture_url.includes('cloudinary')) {
            const publicId = extractPublicId(community.community_picture_url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`Deleted old community image: ${publicId}`);
            }
        }

        const community_picture_url = req.file.path;
        const updatedCommunity = await Community.update(communityId, {
            community_picture_url
        });

        res.status(200).json({
            message: 'Community picture updated successfully',
            community_picture_url: updatedCommunity.community_picture_url
        });
    } catch (error) {
        console.error('Error updating community picture:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

//Moderator will be chosen by community owner or vote of members: 1 minute of voting time with redis - future implementation



module.exports = {
    createCommunity,
    getAllCommunities,
    getUserCommunities,
    updateCommunity,
    updateCommunityPicture,
    joinCommunity,
    leaveCommunity,
    setMemberStatus,
    setMemberRole,
    getCommunityMembers,
    getCommunityByName,
    getCommunityFeed,
    getApprovedMemberCount,
    getPendingMembers
}