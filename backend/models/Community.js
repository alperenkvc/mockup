const db = require('../config/db');

class Community {
    /**
     * @desc    Create a new community
     * @route   Model Method
     * @access  Private
     */
    static async create(data) {
        const { community_name, description, type, community_picture_url, creator_id } = data;
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            //Type: public, private, restricted
            const communitySql = `
                INSERT INTO communities (community_name, description, type, community_picture_url, creator_id)
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING *;
            `;
            const communityResult = await client.query(communitySql, [community_name, description, type, community_picture_url, creator_id]);
            const newCommunity = communityResult.rows[0];

            //role: moderator, member
            //status: approved, pending, rejected, banned
            const memberSql = `
                INSERT INTO community_members (community_id, user_id, community_role, status)
                VALUES ($1, $2, $3, $4);
            `;
            const memberValues = [newCommunity.id, creator_id, 'moderator', 'approved'];
            await client.query(memberSql, memberValues);

            await client.query('COMMIT');
            return newCommunity;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * @desc    Update a community
     * @route   Model Method
     * @access  Moderator/Admin
     */
    static async update(id, data) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const updates = [];
            const values = [];
            let placeholderIndex = 1;

            const allowedFields = ['community_name', 'description', 'type', 'community_picture_url'];

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

            values.push(id);
            const sql = `
                UPDATE communities 
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

    /**
     * @desc    Find a community by its name
     * @route   Model Method
     * @access  Public
     */
    static async findByName(name) {
        const sql = 'SELECT * FROM communities WHERE community_name = $1 AND is_active = true';
        const { rows } = await db.query(sql, [name]);
        return rows[0];
    }

    /**
     * @desc    Get community by name with member count and user join status
     * @route   Model Method
     * @access  Public/Private
     */
    static async getByNameWithMemberInfo(name, requestingUserId = null) {
        const sql = `
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') AS member_count,
                CASE 
                    WHEN $2::INT IS NOT NULL THEN (
                        SELECT status FROM community_members 
                        WHERE user_id = $2::INT AND community_id = c.id
                    )
                    ELSE NULL 
                END AS user_membership_status,
                CASE 
                    WHEN $2::INT IS NOT NULL THEN (
                        SELECT community_role FROM community_members 
                        WHERE user_id = $2::INT AND community_id = c.id AND status = 'approved'
                    )
                    ELSE NULL 
                END AS user_role
            FROM communities c
            WHERE c.community_name = $1 AND c.is_active = true;
        `;
        const userId = requestingUserId ? parseInt(requestingUserId, 10) : null;
        const { rows } = await db.query(sql, [name, userId]);
        return rows[0];
    }

    /**
     * @desc    Find a community by its id
     * @route   Model Method
     * @access  Public
     */
    static async findById(id) {
        const sql = 'SELECT * FROM communities WHERE id = $1 AND is_active = true';
        const { rows } = await db.query(sql, [id]);
        return rows[0];
    }

    /**
     * @desc    Get all communities
     * @route   Model Method
     * @access  Public
     */
    static async getAll() {
        const sql = `SELECT 
    c.id, 
    c.community_name, 
    c.description, 
    c.community_picture_url,
    COUNT(cm.user_id) AS member_count
FROM communities c
LEFT JOIN community_members cm ON c.id = cm.community_id
WHERE c.is_active = true
GROUP BY c.id
ORDER BY member_count DESC
LIMIT 20;`;
        const { rows } = await db.query(sql);
        return rows;
    }

    /**
     * @desc    Get community feed
     * @route   Model Method
     * @access  Public/Private
     */
    static async getCommunityFeed(communityId, requestingUserId = null) {
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
        WHERE p.community_id = $1 
          AND p.status = 'published'
          AND p.is_deleted = false
        ORDER BY p.created_at DESC;
        `;

        // Ensure requestingUserId is actually a number or null
        const userId = requestingUserId ? parseInt(requestingUserId, 10) : null;

        const { rows } = await db.query(sql, [communityId, userId]);
        return rows;
    }
}

module.exports = Community;