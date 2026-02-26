const Post = require('../models/Post');
const ogs = require('open-graph-scraper');

/**
 * @desc    Create a new post
 * @route   POST /api/posts/submit
 * @access  Private
 * @isTested true
 */
const createPost = async (req, res) => {
    try {
        const author_id = req.user.id;

        // Use the URL parameter (?type=IMAGE) or fallback to the body value
        const post_type = (req.query?.type || req.body?.post_type || 'text').toLowerCase();

        const { community_id, title, body_text, link_url, poll_options } = req.body;
        const media_url = req.file ? req.file.path : null;
        const post_status = req.body.status === 'draft' ? 'draft' : 'published' ;
        let og_title = null;
        let og_image = null;
        let poll_duration = req.body.poll_time_limit ? `${req.body.poll_time_limit} hours` : null;



        const validTypes = ['text', 'image', 'link', 'poll'];
        if (!validTypes.includes(post_type)) {
            return res.status(400).json({ error: `Invalid post type: ${post_type}` });
        }

        if (post_type === 'link' && link_url) {
            try {
                const { result } = await ogs({ url: link_url, timeout: 5000 });

                og_image = result.ogImage?.url || (Array.isArray(result.ogImage) ? result.ogImage[0]?.url : null);
                og_title = result.ogTitle || title;
            } catch (scrapError) {
                console.error('Error fetching OG data:', scrapError.message);
                // Proceed without OG data
            }
        }

        if (post_type === 'link' && !link_url) {
            return res.status(400).json({ error: 'Link posts require a valid URL' });
        }

        let pollOptions = poll_options;

        if (post_type === 'poll') {
            if (!pollOptions || pollOptions.length < 2) {
                return res.status(400).json({ error: 'Poll posts require at least two options' });
            }

            if (typeof pollOptions === 'string') {
                try {
                    pollOptions = JSON.parse(pollOptions);
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid poll options format' });
                }
            }

            if (!Array.isArray(pollOptions)) {
                return res.status(400).json({ error: 'Poll options must be an array' });
            }

            pollOptions = pollOptions
                .map((option) => String(option).trim())
                .filter((option) => option.length > 0);

            if (pollOptions.length < 2) {
                return res.status(400).json({ error: 'Poll posts require at least two options' });
            }

            const optionSet = new Set(pollOptions);
            if (optionSet.size !== pollOptions.length) {
                return res.status(400).json({ error: 'Poll options must be unique' });
            }
        }

        const newPost = await Post.create({
            author_id,
            community_id,
            title,
            post_type,
            body_text,
            media_url,
            link_url,
            poll_options: pollOptions,
            og_title,
            og_image,
            poll_duration,
            status: post_status,
        });

        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * @desc    Get drafts for the authenticated user
 * @route   GET /api/posts/drafts
 * @access  Private
 * @isTested true
 */
const getUserDrafts = async (req, res) => {
    const userId = req.user.id;
    const drafts = await Post.findDraftsByUser(userId);
    res.json(drafts);
};

/**
 * @desc    Verify a post as news (admin only)
 * @route   not defined yet (postController)
 * @access  Private
 * @isTested false
 */
const verifyAsNews = async (req, res) => {
    try {
        const { id } = req.params;
        //check if user.role === "admin"

        const updatedPost = await Post.verifyNews(id);
        if (!updatedPost) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.status(200).json({
            message: 'Post verified as news',
            post: updatedPost
        })
    } catch (error) {
        console.error('Error verifying post as news:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Get news feed posts
 * @route   not defined yet (postController)
 * @access  Private
 * @isTested false
 */
const getNews = async (req, res) => {
    try {
        const newsPosts = await Post.getNewsFeed();

        res.status(200).json(newsPosts);
    } catch (error) {
        console.error('Error fetching news feed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Get posts for user's feed
 * @route   GET /api/posts/feed
 * @access  Public/Private (optionalProtect)
 * @isTested true
 */
const getFeed = async (req, res) => {
    try {
        const requestingUserId = req.user ? req.user.id : null;
        const feedPosts = await Post.getFeed(requestingUserId);

        res.status(200).json(feedPosts);
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Cast a vote in a poll
 * @route   POST /api/posts/:postId/poll-vote
 * @access  Private
 * @isTested true
 */
const castPollVote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        const { optionId } = req.body;
        const vote = await Post.castPollVote(userId, postId, optionId);

        res.status(201).json({
            message: "Vote cast successfully!",
            vote
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'You have already voted in this poll.' });
        }

        if(error.message.includes('expired')) {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error casting poll vote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * @desc    Cast a vote (upvote, downvote, unvote) on a post
 * @route   POST /api/posts/:postId/vote
 * @access  Private
 * @isTested true
 */
const castVote = async (req, res) => {
    try{
        const userId = req.user.id;
        const { postId } = req.params;
        const { vote_value } = req.body; // Expected to be 1 (upvote), -1 (downvote), or 0 (unvote)

        if(![1, -1, 0].includes(vote_value)) {
            return res.status(400).json({ error: 'Invalid vote value. Must be 1, -1, or 0.' });
        }

        const updatedCounts = await Post.updateVote(userId, postId, vote_value);

        if(!updatedCounts) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        res.status(200).json({
            message: 'Vote recorded successfully.',
            upvotes: updatedCounts.upvotes,
            downvotes: updatedCounts.downvotes,
            current_user_vote: updatedCounts.current_user_vote
        });
    } catch(error) {
        console.error('Error casting vote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Delete a post (mark as deleted) - Author only
 * @route   DELETE /api/posts/:postId
 * @access  Private
 * @isTested true
 */
const deletePost = async (req, res) => {
    try{
        const { postId } = req.params;
        const userId = req.user.id;

        const deleted = await Post.delete(postId, userId);

        if(!deleted) {
            return res.status(404).json({ error: 'Post not found or you do not have permission to delete it.' });
        }

        res.status(200).json({
            message: 'Post marked as deleted. Will be deleted from server in 7 days.',
            post: deleted
        });
    } catch(error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Delete a post as moderator (soft delete)
 * @route   DELETE /api/posts/:postId/moderator-delete
 * @access  Private (Moderator)
 */
const moderatorDeletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        const { reason } = req.body; // Optional deletion reason

        // Check if user is moderator of the post's community
        const isModerator = await Post.isModeratorOfPostCommunity(postId, userId);
        
        if (!isModerator) {
            return res.status(403).json({ error: 'You do not have permission to delete this post. Only moderators can delete posts in their communities.' });
        }

        const deleted = await Post.moderatorDelete(postId, reason);

        if (!deleted) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        res.status(200).json({
            message: 'Post deleted by moderator.',
            post: deleted
        });
    } catch (error) {
        console.error('Error deleting post as moderator:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//Saving post logic

/**
 * @desc    Toggle save/unsave a post for the authenticated user
 * @route   POST /api/posts/:postId/toggle-save
 * @access  Private
 * @isTested true
 */
const toggleSavePost = async (req, res) => {
    try {
        const {postId} = req.params;
        const userId = req.user.id;

        const result = await Post.toggleSave(userId, postId);

        res.status(200).json({
            message: result.saved ? 'Post saved successfully.' : 'Post unsaved successfully.',
            isSaved: result.saved
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Get saved posts for the authenticated user
 * @route   GET /api/posts/saved
 * @access  Private
 * @isTested true
 */
const getSavedPosts = async (req, res) => {
    try {
        const userId = req.user.id;
        const {limit, offset} = req.query;

        const posts = await Post.getSavedPosts(userId, limit, offset);
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Get a single post by ID
 * @route   GET /api/posts/:postId
 * @access  Public/Private (optionalProtect)
 * @isTested true
 */
const getPostById = async (req, res) => {
    try {
        const { postId } = req.params;
        const requestingUserId = req.user ? req.user.id : null;
        const { includeDeleted } = req.query; // Allow fetching deleted posts via query param

        // Check if user is moderator of the post's community (to allow viewing deleted posts)
        let canViewDeleted = false;
        if (includeDeleted === 'true' && requestingUserId) {
            canViewDeleted = await Post.isModeratorOfPostCommunity(postId, requestingUserId);
        }

        const post = await Post.getById(postId, requestingUserId, canViewDeleted);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.status(200).json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * @desc    Get posts by a specific user
 * @route   GET /api/posts/user/:userId
 * @access  Public/Private (optionalProtect)
 * @isTested true
 */
const getPostsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user ? req.user.id : null;
        const { limit = 20, offset = 0 } = req.query;

        const posts = await Post.getPostsByUser(userId, requestingUserId, parseInt(limit), parseInt(offset));
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createPost,
    getUserDrafts,
    verifyAsNews,
    getNews,
    getFeed,
    getPostById,
    castPollVote,
    castVote,
    deletePost,
    moderatorDeletePost,
    toggleSavePost,
    getSavedPosts,
    getPostsByUser
};