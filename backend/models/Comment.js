const db = require('../config/db');

class Comment {

    /**
     * @desc    Create a new comment or reply
     * @route   Model Method
     * @access  Public/Private
     */
    static async create(data) {
        const { post_id, author_id, parent_id, content, media_url = null, comment_type = 'text' } = data;
        const sql = `
        INSERT INTO comments (post_id, author_id, parent_id, content, media_url, comment_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
        const values = [post_id, author_id, parent_id || null, content, media_url, comment_type];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    /**
     * @desc    Update an existing comment
     * @route   Model Method
     * @access  Private (only author can update)
     */
static async update(content, id, authorId) {
    // Ensure content is actually a string before trimming
    const cleanContent = typeof content === 'string' ? content.trim() : content;
    
    const sql = `
        UPDATE comments 
        SET content = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND author_id = $3
        RETURNING *;
    `;
    const { rows } = await db.query(sql, [cleanContent, id, authorId]);
    return rows[0];
}

    /**
     * @desc    Soft delete a comment by setting its content to '[deleted]'
     * @route   Model Method
     * @access  Private (only author can delete)
     */
    static async softDelete(commentId, authorId) {
        const sql = `
            UPDATE comments
            SET content = '[deleted]',
            is_deleted = true,
            media_url = NULL,
            comment_type = 'text'
            WHERE id = $1 AND author_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [commentId, authorId]);
        return rows[0];
    }

    /**
 * @desc    Get comments for a post (recursive with replies)
 * @route   Model Method
 * @access  Public/Private
 */
    static async getByPostId(postId, requestingUserId = null) {
        const sql = `
        WITH RECURSIVE comment_tree AS (
            --Top-level comments
            SELECT 
                c.id, c.post_id, c.author_id, c.parent_id, c.content, 
                c.comment_type, c.media_url, c.created_at, c.is_edited, c.is_deleted,
                c.score,
                1 AS depth
            FROM comments c
            WHERE c.post_id = $1 AND c.parent_id IS NULL

            UNION ALL

            --Find replies
            SELECT 
                c.id, c.post_id, c.author_id, c.parent_id, c.content, 
                c.comment_type, c.media_url, c.created_at, c.is_edited, c.is_deleted,
                c.score,
                ct.depth + 1
            FROM comments c
            JOIN comment_tree ct ON c.parent_id = ct.id
        )
        SELECT 
            ct.*, 
            u.username AS author_username, 
            u.profile_picture_url AS author_avatar,
            -- Check if current user has voted on this comment
            CASE 
                WHEN $2::INT IS NOT NULL THEN (SELECT vote_value FROM comment_votes WHERE comment_id = ct.id AND user_id = $2::INT)
                ELSE NULL 
            END AS user_vote
        FROM comment_tree ct
        JOIN users u ON ct.author_id = u.id
        ORDER BY ct.score DESC, ct.created_at DESC;
    `;

        const { rows } = await db.query(sql, [postId, requestingUserId]);
        return rows;
    }

    /**
     * @desc    Vote on a comment (upvote/downvote)
     * @route   Model Method
     * @access  Private
     */
static async vote(commentId, userId, voteValue) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        //Check for an existing vote
        const existingVoteSql = `SELECT vote_value FROM comment_votes WHERE comment_id = $1 AND user_id = $2`;
        const { rows } = await client.query(existingVoteSql, [commentId, userId]);

        let scoreDelta = 0;

        if (rows.length > 0) {
            const oldVote = rows[0].vote_value;
            if (oldVote === voteValue) {
                //REMOVE the vote
                await client.query('DELETE FROM comment_votes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
                scoreDelta = -oldVote;
            } else {
                //UPDATE the vote
                await client.query('UPDATE comment_votes SET vote_value = $1 WHERE comment_id = $2 AND user_id = $3', [voteValue, commentId, userId]);
                scoreDelta = voteValue - oldVote;
            }
        } else {
            // New vote
            await client.query('INSERT INTO comment_votes (comment_id, user_id, vote_value) VALUES ($1, $2, $3)', [commentId, userId, voteValue]);
            scoreDelta = voteValue;
        }

        //Update the cached score
        const updateScoreSql = `
            UPDATE comments 
            SET score = score + $1 
            WHERE id = $2 AND is_deleted = false
            RETURNING score
        `;
        const scoreResult = await client.query(updateScoreSql, [scoreDelta, commentId]);

        if (scoreResult.rows.length === 0) {
            throw new Error('Cannot vote on a deleted comment');
        }

        await client.query('COMMIT');
        return { 
            score: scoreResult.rows[0].score, 
            user_vote: scoreDelta === (rows.length > 0 ? -rows[0].vote_value : 0) ? null : voteValue 
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

    /**
     * @desc    Get comments by a specific user
     * @route   Model Method
     * @access  Public/Private
     */
    static async getByUserId(userId, requestingUserId = null, limit = 20, offset = 0) {
        const sql = `
        SELECT 
            c.*,
            u.username AS author_username,
            u.profile_picture_url AS author_avatar,
            p.title AS post_title,
            p.id AS post_id,
            CASE 
                WHEN $2::INT IS NOT NULL THEN (SELECT vote_value FROM comment_votes WHERE comment_id = c.id AND user_id = $2::INT)
                ELSE NULL 
            END AS user_vote
        FROM comments c
        JOIN users u ON c.author_id = u.id
        JOIN posts p ON c.post_id = p.id
        WHERE c.author_id = $1 
          AND c.is_deleted = false
          AND p.is_deleted = false
        ORDER BY c.created_at DESC
        LIMIT $3 OFFSET $4;
    `;
        const reqUserId = requestingUserId ? parseInt(requestingUserId, 10) : null;
        const { rows } = await db.query(sql, [userId, reqUserId, limit, offset]);
        return rows;
    }
}

module.exports = Comment;