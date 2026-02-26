const db = require('../config/db');

class CommunityMember {
    
    /**
     * @desc    Join a community
     * @route   Model Method
     * @access  Private
     */
    static async join(userId, communityId) {
        // 1. Check user status
        const statusCheckSql = `
        SELECT status FROM community_members 
        WHERE user_id = $1 AND community_id = $2;
    `;
        const statusResult = await db.query(statusCheckSql, [userId, communityId]);

        if (statusResult.rows.length > 0) {
            const currentStatus = statusResult.rows[0].status;
            if (currentStatus === 'banned') return { error: 'banned' };
            if (currentStatus === 'pending') return { error: 'already_pending' };
            if (currentStatus === 'approved') return { error: 'already_member' };
        }

        //Get the community type
        const typeSql = `SELECT type FROM communities WHERE id = $1;`;
        const typeResult = await db.query(typeSql, [communityId]);

        if (typeResult.rows.length === 0) return { error: 'not_found' };

        const communityType = typeResult.rows[0].type;

        //Determine initial user status
        // Public : approved, Restricted/Private : pending
        const initialStatus = (communityType === 'public') ? 'approved' : 'pending';

        // 4. Perform the Join
        const joinSql = `
        INSERT INTO community_members (user_id, community_id, community_role, status)
        VALUES ($1, $2, 'member', $3)
        RETURNING *;
    `;
        const { rows } = await db.query(joinSql, [userId, communityId, initialStatus]);
        return { data: rows[0], status: initialStatus };
    }

    /**
     * @desc    Check if a user is a member of a community
     * @route   Model Method
     * @access  Private
     */
    static async checkMembership(userId, communityId) {
        const sql = `
            SELECT * FROM community_members 
            WHERE user_id = $1 AND community_id = $2;
        `;

        if(rows.length === 0){
            return {error: 'not_member'};
        }

        const { rows } = await db.query(sql, [userId, communityId]);
        return rows.length > 0;
    }

    /**
     * @desc    Leave a community
     * @route   Model Method
     * @access  Private
     */
    static async leave(userId, communityId) {
        const sql = `
            DELETE FROM community_members 
            WHERE user_id = $1 AND community_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [userId, communityId]);
        return rows.length > 0;
    }

    /**
     * @desc    Get a member's status in a community
     * @route   Model Method
     * @access  Private
     */
    static async getMemberStatus(userId, communityId) {
        const sql = `
            SELECT status, community_role
            FROM community_members 
            WHERE user_id = $1 AND community_id = $2;
        `;
        const { rows } = await db.query(sql, [userId, communityId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * @desc    Set membership status
     * @route   Model Method
     * @access  Moderator/Admin
     */
    static async setStatus(userId, communityId, status, banReason = null) {
        // If banning, include ban_reason if the column exists
        // We'll try with ban_reason first, fallback to without if column doesn't exist
        let sql;
        let values;
        
        if (status === 'banned' && banReason) {
            sql = `
                UPDATE community_members 
                SET status = $3, ban_reason = $4
                WHERE user_id = $1 AND community_id = $2
                RETURNING *;
            `;
            values = [userId, communityId, status, banReason];
        } else {
            sql = `
                UPDATE community_members 
                SET status = $3
                WHERE user_id = $1 AND community_id = $2
                RETURNING *;
            `;
            values = [userId, communityId, status];
        }
        
        const { rows } = await db.query(sql, values);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * @desc    Get a member's role in a community
     * @route   Model Method
     * @access  Private
     */
    static async getMemberRole(userId, communityId) {
        const sql = `
            SELECT community_role, status
            FROM community_members 
            WHERE user_id = $1 AND community_id = $2;
        `;
        const { rows } = await db.query(sql, [userId, communityId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * @desc    Set membership role
     * @route   Model Method
     * @access  Admin/Voting
     */
    static async setRole(userId, communityId, role) {
        const sql = `
            UPDATE community_members 
            SET community_role = $3
            WHERE user_id = $1 AND community_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(sql, [userId, communityId, role]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * @desc    Get members of a community with user information
     * @route   Model Method
     * @access  Public
     */
    static async getMembers(communityId, status = 'approved') {
        const sql = `
            SELECT 
                cm.user_id,
                cm.community_id,
                cm.community_role,
                cm.status,
                cm.joined_at,
                u.username,
                u.profile_picture_url
            FROM community_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.community_id = $1 
              AND cm.status = $2
            ORDER BY 
                CASE WHEN cm.community_role = 'moderator' THEN 1 ELSE 2 END,
                cm.joined_at ASC;
        `;
        const { rows } = await db.query(sql, [communityId, status]);
        return rows;
    }

    /**
     * @desc    Get count of approved members in a community
     * @route   Model Method
     * @access  Public
     */
    static async getMemberCount(communityId) {
        const sql = `
            SELECT COUNT(*) FROM community_members 
            WHERE community_id = $1 AND status = 'approved';
        `;
        const { rows } = await db.query(sql, [communityId]);
        return parseInt(rows[0].count, 10);
    }

    /**
     * @desc    Get pending members in a community with user information
     * @route   Model Method
     * @access  Moderator/Admin
     */
    static async getPendingMembers(communityId) {
        const sql = `
            SELECT 
                cm.user_id,
                cm.community_id,
                cm.community_role,
                cm.status,
                cm.joined_at,
                u.username,
                u.profile_picture_url,
                u.id
            FROM community_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.community_id = $1 AND cm.status = 'pending'
            ORDER BY cm.joined_at ASC;
        `;
        const { rows } = await db.query(sql, [communityId]);
        return rows;
    }

    /**
     * @desc    Get all moderators of a community
     * @route   Model Method
     * @access  Public
     */
    static async getModerators(communityId) {
        const sql = `
            SELECT user_id
            FROM community_members 
            WHERE community_id = $1 
              AND community_role = 'moderator' 
              AND status = 'approved';
        `;
        const { rows } = await db.query(sql, [communityId]);
        return rows.map(row => row.user_id);
    }

    /**
     * @desc    Check if a user is banned from a community
     * @route   Model Method
     * @access  Private
     */
    static async isBannedFromCommunity(userId, communityId) {
        const sql = `
            SELECT status FROM community_members 
            WHERE user_id = $1 AND community_id = $2
        `;
        const { rows } = await db.query(sql, [userId, communityId]);
        if (rows.length === 0) {
            return false; // Not a member, so not banned
        }
        return rows[0].status === 'banned';
    }

    /**
     * @desc    Get communities that a user is a member of
     * @route   Model Method
     * @access  Private
     */
    static async getCommunitiesByUser(userId) {
        const sql = `
            SELECT 
                c.id,
                c.community_name,
                c.description,
                c.community_picture_url,
                c.type,
                cm.community_role,
                cm.status,
                cm.joined_at,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') AS member_count
            FROM community_members cm
            JOIN communities c ON cm.community_id = c.id
            WHERE cm.user_id = $1 
              AND cm.status = 'approved'
              AND c.is_active = true
            ORDER BY cm.joined_at DESC;
        `;
        const { rows } = await db.query(sql, [userId]);
        return rows;
    }
}

module.exports = CommunityMember;