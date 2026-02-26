const db = require('../config/db');

class Post {
    /**
    * @desc    Create a new post
    * @route   Model Method
    * @access  Private
    */
    static async create(data) {
        const { author_id, community_id, title, post_type, body_text, media_url, link_url, poll_options, og_title, og_image, poll_duration, status: post_status } = data;

        // Get a client from the pool to handle the transaction
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Insert the main post
            const postSql = `
                INSERT INTO posts (author_id, community_id, title, post_type, body_text, media_url, link_url, og_title, og_image, poll_duration, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
                RETURNING *;
            `;
            const postValues = [author_id, community_id || null, title, post_type, body_text, media_url || null, link_url || null, og_title || null, og_image || null, poll_duration || null, post_status || 'published'];
            const postResult = await client.query(postSql, postValues);
            const newPost = postResult.rows[0];

            // If it's a poll, insert options into the poll_options table
            if (post_type === 'poll' && Array.isArray(poll_options)) {
                const optionSql = `INSERT INTO poll_options (post_id, option_text) VALUES ($1, $2) RETURNING id, option_text`;
                const options = [];

                for (const text of poll_options) {
                    const optionResult = await client.query(optionSql, [newPost.id, text]);
                    options.push(optionResult.rows[0]);
                }

                // Attach options in the same shape used by feed queries
                newPost.poll_data = options.map((option) => ({
                    ...option,
                    vote_count: 0
                }));
            }

            await client.query('COMMIT');
            return newPost;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
    * @desc    Cast a vote in a poll
    * @route   Model Method
    * @access  Private
    */
    static async castPollVote(userId, postId, optionId) {
        const sql = `
        INSERT INTO poll_votes (user_id, post_id, option_id)
        SELECT $1, $2, $3
        FROM posts p
        WHERE p.id = $2 
          -- Logic: created_at + duration must be in the future
          AND (p.created_at + p.poll_duration > NOW() OR p.poll_duration IS NULL)
        RETURNING *;
    `;
        const { rows } = await db.query(sql, [userId, postId, optionId]);

        if (rows.length === 0) {
            throw new Error('This poll has expired or does not exist.');
        }
        return rows[0];
    }

    /**
    * @desc    Verify a post as news
    * @route   Model Method
    * @access  Private
    */
    static async verifyNews(postId) {
        const sql = `
            UPDATE posts 
            SET is_news = true 
            WHERE id = $1 
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [postId]);
        return rows[0];
    }

    /**
    * @desc    Get news feed posts
    * @route   Model Method
    * @access  Private
    */
    static async getNewsFeed() {
        const sql = `
        SELECT 
            p.id, 
            p.title, 
            p.media_url, 
            p.created_at,
            u.username AS author_name,
            c.community_name,
            c.community_picture_url
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE p.is_news = true 
          AND p.is_deleted = false 
          AND p.post_type = 'image' -- Usually, news bars look best with images
        ORDER BY p.created_at DESC
        LIMIT 10; -- You only need the top few for a horizontal bar
    `;
        const { rows } = await db.query(sql);
        return rows;
    }

    /**
    * @desc    Get feed posts
    * @route   Model Method
    * @access  Private
    */
    static async getFeed(requestingUserId = null) {
        const sql = `
        SELECT 
            p.*, 
            u.username AS author_name,
            c.community_name,
            (
                SELECT json_agg(json_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'vote_count', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id)
                ))
                FROM poll_options po
                WHERE po.post_id = p.id
            ) AS poll_data,
            CASE 
                WHEN $1::INT IS NOT NULL THEN (SELECT vote_value FROM votes WHERE post_id = p.id AND user_id = $1::INT)
                ELSE NULL 
            END AS user_vote,
            CASE 
                WHEN $1::INT IS NOT NULL THEN EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1::INT)
                ELSE false 
            END AS is_saved,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE p.status = 'published' AND p.is_deleted = false
        ORDER BY p.created_at DESC;
    `;
        const userId = requestingUserId ? parseInt(requestingUserId, 10) : null;
        const { rows } = await db.query(sql, [userId]);
        return rows;
    }

    /**
    * @desc    Get posts by community IDs (for custom feeds)
    * @route   Model Method
    * @access  Public/Private
    */
    static async getByCommunityIds(communityIds, requestingUserId = null) {
        if (!communityIds || communityIds.length === 0) {
            return [];
        }

        const sql = `
        SELECT 
            p.*, 
            u.username AS author_name,
            c.community_name,
            (
                SELECT json_agg(json_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'vote_count', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id)
                ))
                FROM poll_options po
                WHERE po.post_id = p.id
            ) AS poll_data,
            CASE 
                WHEN $2::INT IS NOT NULL THEN (SELECT vote_value FROM votes WHERE post_id = p.id AND user_id = $2::INT)
                ELSE NULL 
            END AS user_vote,
            CASE 
                WHEN $2::INT IS NOT NULL THEN EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2::INT)
                ELSE false 
            END AS is_saved,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE p.community_id = ANY($1::INT[])
          AND p.status = 'published' 
          AND p.is_deleted = false
        ORDER BY p.created_at DESC;
    `;
        const userId = requestingUserId ? parseInt(requestingUserId, 10) : null;
        const { rows } = await db.query(sql, [communityIds, userId]);
        return rows;
    }

    /**
    * @desc    Get a single post by ID
    * @route   Model Method
    * @access  Public/Private
    */
    static async getById(postId, requestingUserId = null, includeDeleted = false) {
        let sql = `
        SELECT 
            p.*, 
            u.username AS author_name,
            u.id AS author_id,
            c.community_name,
            (
                SELECT json_agg(json_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'vote_count', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id)
                ))
                FROM poll_options po
                WHERE po.post_id = p.id
            ) AS poll_data,
            CASE 
                WHEN $2::INT IS NOT NULL THEN (SELECT vote_value FROM votes WHERE post_id = p.id AND user_id = $2::INT)
                ELSE NULL 
            END AS user_vote,
            CASE 
                WHEN $2::INT IS NOT NULL THEN EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2::INT)
                ELSE false 
            END AS is_saved,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE p.id = $1 
        AND p.status = 'published'`;
        
        if (!includeDeleted) {
            sql += ' AND p.is_deleted = false';
        }
        
        sql += ';';
        
        const userId = requestingUserId ? parseInt(requestingUserId, 10) : null;
        const { rows } = await db.query(sql, [postId, userId]);
        return rows[0];
    }

    /**
    * @desc    Get drafts for a specific user
    * @route   Model Method
    * @access  Private
    */
    static async findDraftsByUser(userId) {
        const sql = `SELECT * FROM posts WHERE author_id = $1 AND status = 'draft' ORDER BY updated_at DESC`;
        const { rows } = await db.query(sql, [userId]);
        return rows;
    }

    /**
    * @desc    Get published posts for a specific user
    * @route   Model Method
    * @access  Public/Private
    */
    static async getPostsByUser(userId, requestingUserId = null, limit = 20, offset = 0) {
        const sql = `
        SELECT 
            p.*, 
            u.username AS author_name,
            c.community_name,
            (
                SELECT json_agg(json_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'vote_count', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id)
                ))
                FROM poll_options po
                WHERE po.post_id = p.id
            ) AS poll_data,
            CASE 
                WHEN $2::INT IS NOT NULL THEN (SELECT vote_value FROM votes WHERE post_id = p.id AND user_id = $2::INT)
                ELSE NULL 
            END AS user_vote,
            CASE 
                WHEN $2::INT IS NOT NULL THEN EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2::INT)
                ELSE false 
            END AS is_saved,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = false) AS comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE p.author_id = $1 
          AND p.status = 'published' 
          AND p.is_deleted = false
        ORDER BY p.created_at DESC
        LIMIT $3 OFFSET $4;
    `;
        const reqUserId = requestingUserId ? parseInt(requestingUserId, 10) : null;
        const { rows } = await db.query(sql, [userId, reqUserId, limit, offset]);
        return rows;
    }

    /**
    * @desc    Update vote (upvote, downvote, unvote) for a post
    * @route   Model Method
    * @access  Private
    */
    static async updateVote(userId, postId, voteValue) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            // Unvote
            if (voteValue === 0) {
                await client.query(
                    'DELETE FROM votes WHERE user_id = $1 AND post_id = $2',
                    [userId, postId]
                );
            } else {
                await client.query(`
                INSERT INTO votes (user_id, post_id, vote_value)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, post_id) 
                DO UPDATE SET vote_value = EXCLUDED.vote_value, created_at = NOW()`,
                    [userId, postId, voteValue]
                );
            }

            // Update the posts table with new vote counts
            const updatePostSql = `
            UPDATE posts 
            SET 
                upvotes = (SELECT COUNT(*) FROM votes WHERE post_id = $1 AND vote_value = 1),
                downvotes = (SELECT COUNT(*) FROM votes WHERE post_id = $1 AND vote_value = -1)
            WHERE id = $1
            RETURNING upvotes, downvotes;
        `;

            const result = await client.query(updatePostSql, [postId]);

            // Get the current user's vote value
            const userVoteSql = `
                SELECT vote_value FROM votes 
                WHERE user_id = $1 AND post_id = $2
            `;
            const userVoteResult = await client.query(userVoteSql, [userId, postId]);
            const current_user_vote = userVoteResult.rows.length > 0 ? userVoteResult.rows[0].vote_value : null;

            await client.query('COMMIT');
            return {
                ...result.rows[0],
                current_user_vote
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
    * @desc    Delete a post (author only)
    * @route   Model Method
    * @access  Private
    */
    static async delete(postId, userId) {
        const sql = `
            UPDATE posts 
            SET is_deleted = true,
            title = '[deleted]',
            post_type = 'text',
            body_text = '[deleted]',
            media_url = NULL,
            link_url = NULL,
            og_title = NULL,
            og_image = NULL,
            poll_duration = NULL
            WHERE id = $1 AND author_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [postId, userId]);
        return rows[0];
    }

    /**
    * @desc    Soft delete a post as moderator (doesn't require author_id check)
    * @route   Model Method
    * @access  Private (Moderator)
    */
    static async moderatorDelete(postId, reason) {
        const deletionReason = reason && reason.trim() ? reason.trim() : '[deleted by moderator]';
        const sql = `
            UPDATE posts 
            SET is_deleted = true,
            title = '[deleted by moderator]',
            post_type = 'text',
            body_text = $2,
            media_url = NULL,
            link_url = NULL,
            og_title = NULL,
            og_image = NULL,
            poll_duration = NULL
            WHERE id = $1
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [postId, deletionReason]);
        return rows[0];
    }

    /**
    * @desc    Check if a post belongs to a community where user is moderator
    * @route   Model Method
    * @access  Private
    */
    static async isModeratorOfPostCommunity(postId, userId) {
        const sql = `
            SELECT EXISTS(
                SELECT 1 
                FROM posts p
                JOIN community_members cm ON p.community_id = cm.community_id
                WHERE p.id = $1 
                AND cm.user_id = $2 
                AND cm.community_role = 'moderator'
                AND cm.status = 'approved'
            ) AS is_moderator;
        `;
        const { rows } = await db.query(sql, [postId, userId]);
        return rows[0]?.is_moderator || false;
    }

    //Methods for saving posts

    /**
    * @desc    Toggle save/unsave a post for a user
    * @route   Model Method
    * @access  Private
    */
    static async toggleSave(userId, postId) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const checkSql = `SELECT 1 FROM saved_posts WHERE user_id = $1 AND post_id = $2`;
            const { rowCount } = await client.query(checkSql, [userId, postId]);

            if (rowCount > 0) {
                // Remove if already saved
                await client.query(`DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
                await client.query('COMMIT');
                return { saved: false };
            } else {
                // Save the post
                await client.query(`INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2)`, [userId, postId]);
                await client.query('COMMIT');
                return { saved: true };
            }
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
    * @desc    Get saved posts for a user
    * @route   Model Method
    * @access  Private
    */
    static async getSavedPosts(userId, limit = 20, offset = 0) {
    //Join with posts table to see content
    const sql = `
        SELECT 
            p.*, 
            u.username AS author_name,
            c.community_name,
            (
                SELECT json_agg(json_build_object(
                    'id', po.id,
                    'option_text', po.option_text,
                    'vote_count', (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id)
                ))
                FROM poll_options po
                WHERE po.post_id = p.id
            ) AS poll_data,
            CASE 
                WHEN $1::INT IS NOT NULL THEN (SELECT vote_value FROM votes WHERE post_id = p.id AND user_id = $1::INT)
                ELSE NULL 
            END AS user_vote,
            true AS is_saved,
            s.saved_at
        FROM saved_posts s
        JOIN posts p ON s.post_id = p.id
        JOIN users u ON p.author_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        WHERE s.user_id = $1 AND p.is_deleted = false
        ORDER BY s.saved_at DESC
        LIMIT $2 OFFSET $3
    `;
    const { rows } = await db.query(sql, [userId, limit, offset]);
    return rows;
}
}

module.exports = Post;