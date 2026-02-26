const db = require('../config/db');

class CustomFeed {

    /**
     * @desc    Create a new custom feed
     * @route   Model Method
     * @access  Private
     */
    static async create({ ownerId, name, description, isPrivate, collabOption }) {
        const sql = `
            INSERT INTO custom_feeds (owner_id, feed_name, description, is_private, collaboration_options)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [ownerId, name, description, isPrivate, collabOption]);
        return rows[0];
    }

    /**
     * @desc    Toggle like/unlike on a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async toggleLike(feedId, userId) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            //Check if already liked
            const checkSql = `SELECT 1 FROM custom_feed_likes WHERE user_id = $1 AND feed_id = $2`;
            const { rowCount } = await client.query(checkSql, [userId, feedId]);

            let isLiked = false;
            let countChange = 0;

            if (rowCount > 0) {
                //Un-like
                await client.query(`DELETE FROM custom_feed_likes WHERE user_id = $1 AND feed_id = $2`, [userId, feedId]);
                countChange = -1;
                isLiked = false;
            } else {
                //Like
                await client.query(`INSERT INTO custom_feed_likes (user_id, feed_id) VALUES ($1, $2)`, [userId, feedId]);
                countChange = 1;
                isLiked = true;
            }

            //Update likes count
            const updateCountSql = `
                UPDATE custom_feeds 
                SET likes_count = likes_count + $1 
                WHERE id = $2 
                RETURNING likes_count;
            `;
            const countResult = await client.query(updateCountSql, [countChange, feedId]);

            await client.query('COMMIT');

            return {
                isLiked,
                newCount: countResult.rows[0].likes_count
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * @desc    Get custom feed by ID with user-specific info
     * @route   Model Method
     * @access  Public/Private
     */
    static async getById(feedId, currentUserId = null) {
        const sql = `
            SELECT f.*, u.username as owner_username,
            EXISTS(SELECT 1 FROM custom_feed_likes WHERE feed_id = f.id AND user_id = $2) as is_liked_by_me,
            (SELECT status FROM custom_feed_collaborators WHERE feed_id = f.id AND user_id = $2) as my_collab_status
            FROM custom_feeds f
            JOIN users u ON f.owner_id = u.id
            WHERE f.id = $1;
        `;
        const { rows } = await db.query(sql, [feedId, currentUserId]);
        return rows[0];
    }

    /**
     * @desc    Check if a community exists in a feed
     * @route   Model Method
     * @access  Private
     */
    static async communityExistsInFeed(feedId, communityId) {
        const sql = `
            SELECT EXISTS(
                SELECT 1 FROM custom_feed_communities 
                WHERE feed_id = $1 AND community_id = $2
            ) AS exists;
        `;
        const { rows } = await db.query(sql, [feedId, communityId]);
        return rows[0].exists;
    }

    /**
     * @desc    Add a community to a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async addCommunity(feedId, communityId) {
        const sql = `
            INSERT INTO custom_feed_communities (feed_id, community_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING;
        `;
        await db.query(sql, [feedId, communityId]);
    }

    /**
     * @desc    Remove a community from a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async removeCommunity(feedId, communityId) {
        const sql = `DELETE FROM custom_feed_communities WHERE feed_id = $1 AND community_id = $2`;
        await db.query(sql, [feedId, communityId]);
    }

    /**
     * @desc    Request collaboration on a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async requestCollaboration(feedId, userId, initialStatus) {
        const sql = `
            INSERT INTO custom_feed_collaborators (feed_id, user_id, status)
            VALUES ($1, $2, $3)
            ON CONFLICT (feed_id, user_id) DO NOTHING
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [feedId, userId, initialStatus]);
        return rows[0];
    }

    /**
     * @desc    Approve a collaborator request
     * @route   Model Method
     * @access  Private
     */
    static async approveCollaborator(feedId, userId) {
        const sql = `
            UPDATE custom_feed_collaborators
            SET status = 'approved'
            WHERE feed_id = $1 AND user_id = $2 AND status = 'pending'
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [feedId, userId]);
        return rows[0];
    }

    /**
     * @desc    Deny a collaborator request
     * @route   Model Method
     * @access  Private
     */
    static async denyCollaborator(feedId, userId) {
        const sql = `
            UPDATE custom_feed_collaborators
            SET status = 'denied'
            WHERE feed_id = $1 AND user_id = $2 AND status = 'pending'
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [feedId, userId]);
        return rows[0];
    }

    /**
     * @desc    Remove a collaborator from a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async removeCollaborator(feedId, userId) {
        const sql = `
            DELETE FROM custom_feed_collaborators
            WHERE feed_id = $1 AND user_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [feedId, userId]);
        return rows[0];
    }

    /**
     * @desc    Check if a user is an approved collaborator on a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async isApprovedCollaborator(feedId, userId) {
        const sql = `
            SELECT 1 FROM custom_feed_collaborators
            WHERE feed_id = $1 AND user_id = $2 AND status = 'approved';
        `;
        const { rowCount } = await db.query(sql, [feedId, userId]);
        return rowCount > 0;
    }

    /**
     * @desc    Get all collaborators for a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async getCollaborators(feedId) {
        const sql = `
            SELECT u.id, u.username, u.profile_picture_url, cfc.status, cfc.joined_at
            FROM custom_feed_collaborators cfc
            JOIN users u ON cfc.user_id = u.id
            WHERE cfc.feed_id = $1
            ORDER BY cfc.joined_at ASC;
        `;
        const { rows } = await db.query(sql, [feedId]);
        return rows;
    }

    /**
     * @desc    Get pending collaboration requests for a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async getPendingCollaborators(feedId) {
        const sql = `
            SELECT u.id, u.username, u.profile_picture_url, cfc.status, cfc.joined_at
            FROM custom_feed_collaborators cfc
            JOIN users u ON cfc.user_id = u.id
            WHERE cfc.feed_id = $1 AND cfc.status = 'pending'
            ORDER BY cfc.joined_at ASC;
        `;
        const { rows } = await db.query(sql, [feedId]);
        return rows;
    }

    /**
     * @desc    Delete a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async delete(feedId) {
        const sql = `DELETE FROM custom_feeds WHERE id = $1 RETURNING *`;
        const { rows } = await db.query(sql, [feedId]);
        return rows[0];
    }

    /**
     * @desc    Get all feeds for a user (owned and collaborated)
     * @route   Model Method
     * @access  Private
     */
    static async getUserFeeds(userId) {
        const sql = `
            SELECT DISTINCT
                f.*,
                u.username as owner_username,
                CASE 
                    WHEN f.owner_id = $1 THEN 'owner'
                    WHEN EXISTS(
                        SELECT 1 FROM custom_feed_collaborators cfc 
                        WHERE cfc.feed_id = f.id 
                        AND cfc.user_id = $1 
                        AND cfc.status = 'approved'
                    ) THEN 'collaborator'
                    ELSE NULL
                END as user_role,
                EXISTS(SELECT 1 FROM custom_feed_likes WHERE feed_id = f.id AND user_id = $1) as is_liked_by_me
            FROM custom_feeds f
            JOIN users u ON f.owner_id = u.id
            WHERE f.owner_id = $1 
               OR EXISTS(
                   SELECT 1 FROM custom_feed_collaborators cfc 
                   WHERE cfc.feed_id = f.id 
                   AND cfc.user_id = $1 
                   AND cfc.status = 'approved'
               )
            ORDER BY f.created_at DESC;
        `;
        const { rows } = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * @desc    Get communities for a custom feed (returns IDs only)
     * @route   Model Method
     * @access  Private
     */
    static async getFeedCommunities(feedId) {
        const sql = `
            SELECT cfc.community_id, c.community_name
            FROM custom_feed_communities cfc
            JOIN communities c ON cfc.community_id = c.id
            WHERE cfc.feed_id = $1;
        `;
        const { rows } = await db.query(sql, [feedId]);
        return rows.map(row => row.community_id);
    }

    /**
     * @desc    Get communities with details for a custom feed
     * @route   Model Method
     * @access  Private
     */
    static async getFeedCommunitiesWithDetails(feedId) {
        const sql = `
            SELECT 
                c.id,
                c.community_name,
                c.description,
                c.community_picture_url,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') AS member_count
            FROM custom_feed_communities cfc
            JOIN communities c ON cfc.community_id = c.id
            WHERE cfc.feed_id = $1
            ORDER BY c.community_name ASC;
        `;
        const { rows } = await db.query(sql, [feedId]);
        return rows;
    }

    /**
     * @desc    Update a custom feed
     * @route   Model Method
     * @access  Private (Owner only)
     */
    static async update(feedId, data) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const updates = [];
            const values = [];
            let placeholderIndex = 1;

            const allowedFields = ['feed_name', 'description', 'is_private', 'collaboration_options'];

            allowedFields.forEach((field) => {
                if (data[field] !== undefined) {
                    updates.push(`${field} = $${placeholderIndex}`);
                    values.push(data[field]);
                    placeholderIndex++;
                }
            });

            if (updates.length === 0) {
                throw new Error('No fields provided for update');
            }

            values.push(feedId);
            const sql = `
                UPDATE custom_feeds 
                SET ${updates.join(', ')} 
                WHERE id = $${placeholderIndex} 
                RETURNING *;
            `;

            const { rows } = await client.query(sql, values);

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = CustomFeed;