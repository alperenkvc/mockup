const CustomFeed = require('../models/CustomFeed');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO, getUserSockets } = require('../config/socket');

/**
 * @desc    Join a collaboration on a custom feed
 * @route   POST /api/custom-feeds/:feedId/join-collaboration
 * @access  Private
 * @isTested true
 */
const joinCollaboration = async (req, res) => {
    try{
        const { feedId } = req.params;
        const userId = req.user.id;

        const feed = await CustomFeed.getById(feedId, userId);
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        if(feed.collaboration_options === 'none'){
            return res.status(403).json({ message: 'This feed is closed for collaboration' });
        }

        // Check if user is already a collaborator
        if(feed.my_collab_status === 'approved' || feed.my_collab_status === 'pending'){
            return res.status(400).json({ 
                message: feed.my_collab_status === 'approved' 
                    ? 'You are already a collaborator' 
                    : 'Your request is pending'
            });
        }

        const initialStatus = feed.collaboration_options === 'free' ? 'approved' : 'pending';

        const collaboration = await CustomFeed.requestCollaboration(feedId, userId, initialStatus);

        if(!collaboration){
            return res.status(400).json({ message: 'Your request is pending, or you are already a collaborator' });
        }

        // Notify the feed owner when a collaborator joins
        if(feed.owner_id && feed.owner_id !== userId) {
            try {
                const collaborator = await User.findById(userId);
                
                if (collaborator) {
                    const notification = await Notification.create({
                        recipient_id: feed.owner_id,
                        sender_id: userId,
                        type: initialStatus === 'approved' ? 'COLLABORATOR_JOINED' : 'COLLABORATION_REQUEST',
                        entity_id: feedId,
                        comment_id: null
                    });

                    // Emit socket.io notification to the feed owner if they're online
                    const io = getIO();
                    const userSockets = getUserSockets();
                    const socketId = userSockets.get(feed.owner_id.toString());
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            notification_id: notification.id,
                            recipient_id: feed.owner_id,
                            sender_id: userId,
                            sender_username: collaborator.username,
                            sender_avatar: collaborator.profile_picture_url,
                            type: initialStatus === 'approved' ? 'COLLABORATOR_JOINED' : 'COLLABORATION_REQUEST',
                            entity_id: feedId,
                            comment_id: null,
                            is_read: false,
                            created_at: notification.created_at
                        });
                    }
                }
            } catch (notifError) {
                console.error('Error sending collaboration notification to feed owner:', notifError);
                // Don't fail the collaboration join if notification fails
            }
        }

        res.status(200).json({ 
            message: initialStatus === 'approved' ? "Joined successfully" : "Request sent",
            status: initialStatus 
        });
    }catch(error){
        console.error('Error joining collaboration:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Create a new custom feed
 * @route   POST /api/custom-feeds/create
 * @access  Private
 * @isTested true
 */
const createFeed = async (req, res) => {
    try{
        const { name, description, isPrivate, collabOption } = req.body;
        const ownerId = req.user.id;

        if (!name) return res.status(400).json({ message: "Feed name is required" });

        const feed = await CustomFeed.create({
            ownerId,
            name,
            description,
            isPrivate: isPrivate || false,
            collabOption: collabOption || 'none'
        });

        res.status(201).json(feed);
    } catch(error){
        res.status(500).json({ message: 'Server error creating custom feed:', error: error.message });
    }
}

/**
 * @desc    Toggle like/unlike on a custom feed
 * @route   POST /api/custom-feeds/:feedId/toggle-like
 * @access  Private
 * @isTested true
 */
const toggleLikeFeed = async (req, res) => {
    try{
        const { feedId } = req.params;
        const userId = req.user.id;

        const result = await CustomFeed.toggleLike(feedId, userId);
        
        // Notify all collaborators (including owner) when someone likes the feed
        if (result.isLiked) {
            try {
                const feed = await CustomFeed.getById(feedId);
                if (feed && feed.owner_id) {
                    // Get all collaborators
                    const collaborators = await CustomFeed.getCollaborators(feedId);
                    const liker = await User.findById(userId);
                    
                    if (liker) {
                        // Create a set of all recipients (owner + collaborators)
                        const recipients = new Set([feed.owner_id]);
                        collaborators.forEach(collab => {
                            // getCollaborators returns rows with 'id' field from users table
                            if (collab.id) {
                                recipients.add(collab.id);
                            }
                        });
                        
                        const io = getIO();
                        const userSockets = getUserSockets();
                        
                        // Notify each recipient (excluding the person who liked)
                        for (const recipientId of recipients) {
                            if (recipientId === userId) continue; // Don't notify the person who liked
                            
                            const notification = await Notification.create({
                                recipient_id: recipientId,
                                sender_id: userId,
                                type: 'FEED_LIKED',
                                entity_id: feedId,
                                comment_id: null
                            });

                            // Emit socket.io notification if recipient is online
                            const socketId = userSockets.get(recipientId.toString());
                            if (socketId) {
                                io.to(socketId).emit('new_notification', {
                                    notification_id: notification.id,
                                    recipient_id: recipientId,
                                    sender_id: userId,
                                    sender_username: liker.username,
                                    sender_avatar: liker.profile_picture_url,
                                    type: 'FEED_LIKED',
                                    entity_id: feedId,
                                    comment_id: null,
                                    is_read: false,
                                    created_at: notification.created_at
                                });
                            }
                        }
                    }
                }
            } catch (notifError) {
                console.error('Error sending like notifications to collaborators:', notifError);
                // Don't fail the like operation if notification fails
            }
        }
        
        res.status(200).json(result);
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Add a community to a custom feed
 * @route   POST /api/custom-feeds/:feedId/add-community/:communityId
 * @access  Private
 * @isTested true
 */
const addCommunityToFeed = async (req, res) => {
    try{
        const { feedId, communityId } = req.params;
        const userId = req.user.id;

        const feed = await CustomFeed.getById(feedId, userId);
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        const isOwner = feed.owner_id === userId;
        const isApproved = feed.my_collab_status === 'approved';

        if(!isOwner && !isApproved){
            return res.status(403).json({ message: 'You do not have permission to modify this feed' });
        }

        // Check if community already exists in feed
        const alreadyExists = await CustomFeed.communityExistsInFeed(feedId, communityId);
        if(alreadyExists){
            return res.status(400).json({ message: 'This community is already in the feed' });
        }

        await CustomFeed.addCommunity(feedId, communityId);
        res.status(200).json({ message: 'Community added to feed successfully' });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Remove a community from a custom feed
 * @route   DELETE /api/custom-feeds/:feedId/remove-community/:communityId
 * @access  Private
 * @isTested true
 */
const removeCommunityFromFeed = async (req, res) => {
    try{
        const { feedId, communityId } = req.params;
        const userId = req.user.id;

        const feed = await CustomFeed.getById(feedId, userId);
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        const isOwner = feed.owner_id === userId;
        const isApproved = feed.my_collab_status === 'approved';

        if(!isOwner && !isApproved){
            return res.status(403).json({ message: 'You do not have permission to modify this feed' });
        }

        await CustomFeed.removeCommunity(feedId, communityId);
        res.status(200).json({ message: 'Community removed from feed successfully' });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Handle a collaboration request on a custom feed
 * @route   POST /api/custom-feeds/:feedId/collaboration-request/:userId
 * @access  Private
 * @isTested true
 */
const handleCollabRequest = async (req, res) => {
    try{
        const { feedId, userId } = req.params;
        const { action } = req.body; // 'approve' or 'deny'
        const ownerId = req.user.id;

        const feed = await CustomFeed.getById(feedId, ownerId);
        
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });
        if(feed.owner_id !== ownerId){
            return res.status(403).json({ message: 'You do not have permission to manage collaborators for this feed' });
        }

        let result;

        if(action === 'approve'){
            result = await CustomFeed.approveCollaborator(feedId, userId);
        } else if(action === 'deny'){
            result = await CustomFeed.denyCollaborator(feedId, userId);
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        if(!result){
            return res.status(404).json({ message: 'Request not found' });
        }

        res.status(200).json({ message: `Collaboration request ${action}d successfully` });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/** 
 * @desc    Delete a custom feed
 * @route   DELETE /api/custom-feeds/:feedId/delete
 * @access  Private
 * @isTested true
 */
const deleteFeed = async (req, res) => {
    try{
        const { feedId } = req.params;
        const ownerId = req.user.id;

        const feed = await CustomFeed.getById(feedId, ownerId);

        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });
        if(feed.owner_id !== ownerId){
            return res.status(403).json({ message: 'You do not have permission to delete this feed' });
        }

        await CustomFeed.delete(feedId);
        res.status(200).json({ message: 'Custom feed deleted successfully' });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/** 
 * @desc    Remove a collaborator from a custom feed (owner only)
 * @route   DELETE /api/custom-feeds/:feedId/remove-collaborator/:userId
 * @access  Private
 * @isTested true
 */
const removeCollaboratorFromFeed = async (req, res) => {
    try{
        const { feedId, userId } = req.params;
        const ownerId = req.user.id;

        const feed = await CustomFeed.getById(feedId, ownerId);

        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });
        if(feed.owner_id !== ownerId){
            return res.status(403).json({ message: 'You do not have permission to remove collaborators from this feed' });
        }

        await CustomFeed.removeCollaborator(feedId, userId);
        res.status(200).json({ message: 'Collaborator removed from feed successfully' });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Quit collaboration on a custom feed (self-remove)
 * @route   POST /api/custom-feeds/:feedId/quit-collaboration
 * @access  Private
 * @isTested true
 */
const quitCollaboration = async (req, res) => {
    try{
        const { feedId } = req.params;
        const userId = req.user.id;

        const feed = await CustomFeed.getById(feedId, userId);
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        // Check if user is a collaborator
        if(feed.my_collab_status !== 'approved' && feed.my_collab_status !== 'pending'){
            return res.status(403).json({ message: 'You are not a collaborator on this feed' });
        }

        // Don't allow owner to quit their own feed
        if(feed.owner_id === userId){
            return res.status(403).json({ message: 'Feed owners cannot quit their own feed' });
        }

        await CustomFeed.removeCollaborator(feedId, userId);
        res.status(200).json({ message: 'You have quit the collaboration successfully' });
    }catch(error){
        console.error('Error quitting collaboration:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/** 
 * @desc    Check if a user is an approved collaborator on a custom feed
 * @route   GET /api/custom-feeds/:feedId/check-collaborator/:userId
 * @access  Private
 * @isTested true
 */
const checkIfUserIsCollaborator = async (req, res) => {
    try{
        const { feedId, userId } = req.params;
        const currentUserId = req.user.id;

        const feed = await CustomFeed.getById(feedId, currentUserId);

        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        const isCollaborator = await CustomFeed.isApprovedCollaborator(feedId, userId);
        res.status(200).json({ isCollaborator });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/** 
 * @desc    Get all collaborators for a custom feed
 * @route   GET /api/custom-feeds/:feedId/collaborators
 * @access  Private
 * @isTested true
 */
const getFeedCollaborators = async (req, res) => {
    try{
        const { feedId } = req.params;
        const currentUserId = req.user.id;

        const feed = await CustomFeed.getById(feedId, currentUserId);
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        const collaborators = await CustomFeed.getCollaborators(feedId);
        res.status(200).json({ collaborators });
    }catch(error){
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Get pending collaboration requests for a custom feed
 * @route   GET /api/custom-feeds/:feedId/pending-requests
 * @access  Private (Owner only)
 */
const getPendingRequests = async (req, res) => {
    try {
        const { feedId } = req.params;
        const currentUserId = req.user.id;

        const feed = await CustomFeed.getById(feedId, currentUserId);
        if(!feed) return res.status(404).json({ message: 'Custom feed not found' });

        // Only feed owner can see pending requests
        if(feed.owner_id !== currentUserId) {
            return res.status(403).json({ message: 'You do not have permission to view pending requests for this feed' });
        }

        const pendingRequests = await CustomFeed.getPendingCollaborators(feedId);
        res.status(200).json({ pendingRequests });
    } catch(error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Get all feeds for the current user (owned and collaborated)
 * @route   GET /api/custom-feeds/my-feeds
 * @access  Private
 * @isTested true
 */
const getUserFeeds = async (req, res) => {
    try {
        const userId = req.user.id;
        const feeds = await CustomFeed.getUserFeeds(userId);
        res.status(200).json(feeds);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Get custom feed details by ID
 * @route   GET /api/custom-feeds/:feedId
 * @access  Private
 * @isTested true
 */
const getFeedById = async (req, res) => {
    try {
        const { feedId } = req.params;
        const userId = req.user.id;

        const feed = await CustomFeed.getById(feedId, userId);
        if (!feed) {
            return res.status(404).json({ message: 'Custom feed not found' });
        }

        // Check access permissions for private feeds
        const isOwner = feed.owner_id === userId;
        const isCollaborator = feed.my_collab_status === 'approved';
        const isPrivate = feed.is_private;

        if (isPrivate && !isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'You do not have access to this feed' });
        }

        // Get communities for this feed
        const communities = await CustomFeed.getFeedCommunitiesWithDetails(feedId);

        res.status(200).json({
            ...feed,
            communities,
            community_count: communities.length
        });
    } catch (error) {
        console.error('Error fetching custom feed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Get posts for a custom feed
 * @route   GET /api/custom-feeds/:feedId/posts
 * @access  Private
 * @isTested true
 */
const getFeedPosts = async (req, res) => {
    try {
        const { feedId } = req.params;
        const userId = req.user.id;

        // Check if user has access to this feed
        const feed = await CustomFeed.getById(feedId, userId);
        if (!feed) {
            return res.status(404).json({ message: 'Custom feed not found' });
        }

        // Check access permissions
        const isOwner = feed.owner_id === userId;
        const isCollaborator = feed.my_collab_status === 'approved';
        const isPrivate = feed.is_private;

        if (isPrivate && !isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'You do not have access to this feed' });
        }

        // Get communities in this feed
        const communityIds = await CustomFeed.getFeedCommunities(feedId);
        
        if (communityIds.length === 0) {
            return res.status(200).json([]);
        }

        // Get posts from those communities
        const posts = await Post.getByCommunityIds(communityIds, userId);
        
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching custom feed posts:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * @desc    Update a custom feed
 * @route   PUT /api/custom-feeds/:feedId
 * @access  Private (Owner only)
 */
const updateFeed = async (req, res) => {
    try {
        const { feedId } = req.params;
        const userId = req.user.id;
        const { name, description, isPrivate, collaboration_options } = req.body;

        const feed = await CustomFeed.getById(feedId, userId);
        if (!feed) {
            return res.status(404).json({ message: 'Custom feed not found' });
        }

        // Only owner can update the feed
        if (feed.owner_id !== userId) {
            return res.status(403).json({ message: 'You do not have permission to update this feed' });
        }

        // Build update data object
        const updateData = {};
        if (name !== undefined) updateData.feed_name = name;
        if (description !== undefined) updateData.description = description;
        if (isPrivate !== undefined) updateData.is_private = isPrivate;
        if (collaboration_options !== undefined) {
            if (collaboration_options !== 'none' && collaboration_options !== 'open' && collaboration_options !== 'request') {
                return res.status(400).json({ message: 'Invalid collaboration option' });
            }
            updateData.collaboration_options = collaboration_options;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No fields provided for update' });
        }

        const updatedFeed = await CustomFeed.update(feedId, updateData);

        res.status(200).json(updatedFeed);
    } catch (error) {
        console.error('Error updating custom feed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    joinCollaboration,
    quitCollaboration,
    createFeed,
    toggleLikeFeed,
    addCommunityToFeed,
    removeCommunityFromFeed,
    handleCollabRequest,
    deleteFeed,
    removeCollaboratorFromFeed,
    checkIfUserIsCollaborator,
    getFeedCollaborators,
    getUserFeeds,
    getFeedById,
    getFeedPosts,
    updateFeed,
    getPendingRequests
}