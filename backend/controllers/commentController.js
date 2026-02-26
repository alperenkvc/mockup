const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { buildCommentTree } = require('../utils/nesterHelper');
const { getIO, getUserSockets } = require('../config/socket');

/**
 * @desc    Add a new comment or reply to a post
 * @route   POST /api/posts/:postId/comments
 * @access  Private
 * @isTested true
 */
const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { parent_id, content, comment_type } = req.body;
        const author_id = req.user.id;
        
        // Handle file upload - similar to posts
        const media_url = req.file ? req.file.path : (req.body.media_url || null);
        const finalCommentType = media_url ? (comment_type || 'media') : (comment_type || 'text');

        if (!content && !media_url) {
            return res.status(400).json({ message: "Comment cannot be empty" });
        }

        const newComment = await Comment.create({
            post_id: postId,
            author_id,
            parent_id: parent_id || null,
            content: content || '',
            media_url,
            comment_type: finalCommentType
        });

        // Notification
        try {
            let recipientId;
            let notificationType;

            if (parent_id) {
                // Notify the author of the parent comment
                const parentComment = await Comment.findById(parent_id);
                if (!parentComment) {
                    throw new Error('Parent comment not found');
                }
                recipientId = parentComment.author_id;
                notificationType = 'REPLY';
            } else {
                // Notify the author of the post
                const post = await Post.getById(postId);
                if (!post) {
                    throw new Error('Post not found');
                }
                recipientId = post.author_id;
                notificationType = 'COMMENT';
            }

            // Only notify if the author isn't replying to themselves
            if (recipientId && recipientId !== author_id) {
                const notification = await Notification.create({
                    recipient_id: recipientId,
                    sender_id: author_id,
                    type: notificationType,
                    entity_id: postId,
                    comment_id: newComment.id
                });

                // Emit the notification to the recipient via socket.io
                const io = getIO();
                const userSockets = getUserSockets();
                const socketId = userSockets.get(recipientId.toString());
                if (socketId) {
                    io.to(socketId).emit('new_notification', {
                        notification_id: notification.id,
                        recipient_id: recipientId,
                        sender_id: author_id,
                        sender_username: req.user.username,
                        sender_avatar: req.user.profile_picture_url,
                        type: notificationType,
                        entity_id: postId,
                        comment_id: newComment.id,
                        is_read: false,
                        created_at: notification.created_at
                    });
                }
            }
        } catch (notifError) {
            console.error('Notification Trigger Error:', notifError);
            // Don't fail the comment creation if notification fails
        }

        res.status(201).json({
            ...newComment,
            author_username: req.user.username,
            author_avatar: req.user.profile_picture_url,
            score: 0,
            replies: []
        });
    } catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({ message: "Server error while adding comment" });
    }
};

/** 
 * @desc    Update an existing comment
 * @route   PATCH /api/comments/:commentId
 * @access  Private
 * @isTested true
 */
const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;

        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "Content cannot be empty" });
        }

        const updatedComment = await Comment.update(content, commentId, authorId);

        if (!updatedComment) {
            return res.status(404).json({ message: "Comment not found or you are not authorized to edit it" });
        }

        res.status(200).json(updatedComment);
    } catch (error) {
        console.error('Update Comment Error:', error);
        res.status(500).json({ message: "Server error while updating comment" });
    }
};

/**
 * @desc    Soft delete a comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 * @isTested true
 */
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const authorId = req.user.id;

        const deletedComment = await Comment.softDelete(commentId, authorId);

        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found or you are not authorized to delete it" });
        }

        res.status(200).json({ message: "Comment deleted successfully", comment: deletedComment });
    } catch (error) {
        console.error('Delete Comment Error:', error);
        res.status(500).json({ message: "Server error while deleting comment" });
    }
}

/**
 * @desc    Vote on a comment (upvote/downvote)
 * @route   POST /api/comments/:commentId/vote
 * @access  Private
 * @isTested true
 */
const voteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { vote_value } = req.body;
        const userId = req.user.id;

        const numericVoteValue = Number(vote_value);

        if (![1, -1].includes(numericVoteValue)) {
            return res.status(400).json({ message: "Invalid vote value. Must be 1 (up) or -1 (down)." });
        }

        const result = await Comment.vote(commentId, userId, numericVoteValue);
        res.status(200).json({
            message: "Vote recorded",
            score: result.score,
            user_vote: result.user_vote
        });
    } catch (error) {
        if (error.message === 'Cannot vote on a deleted comment') {
            return res.status(400).json({ message: error.message });
        }
        console.error('Vote Comment Error:', error);
        res.status(500).json({ message: "Server error while voting" });
    }
};

/**
 * @desc    Get all comments for a post
 * @route   GET /api/posts/:postId/comments
 * @access  Public
 * @isTested true
 */
const getCommentsForPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const requestingUserId = req.user ? req.user.id : null;

        const flatComments = await Comment.getByPostId(postId, requestingUserId);

        if (!flatComments) {
            return res.status(200).json([]);
        }

        // Build nested comment structure
        const nestedComments = buildCommentTree(flatComments);

        res.status(200).json(nestedComments);
    } catch (error) {
        console.error('Get Comments Error:', error);
        res.status(500).json({ message: "Server error while fetching comments" });
    }
}

/**
 * @desc    Get comments by a specific user
 * @route   GET /api/comments/user/:userId
 * @access  Public/Private (optionalProtect)
 * @isTested true
 */
const getCommentsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user ? req.user.id : null;
        const { limit = 20, offset = 0 } = req.query;

        const comments = await Comment.getByUserId(userId, requestingUserId, parseInt(limit), parseInt(offset));
        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching user comments:', error);
        res.status(500).json({ message: "Server error while fetching comments" });
    }
}

module.exports = {
    addComment,
    updateComment,
    deleteComment,
    voteComment,
    getCommentsForPost,
    getCommentsByUser
};