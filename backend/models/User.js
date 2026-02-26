const db = require('../config/db');
const jwt = require('jsonwebtoken');

class User {
    /**
    * @desc    Create a new user
    * @route   Model Method
    * @access  Private
    */
    static async create(data) {
        const { email, password_hash, username, first_name, last_name } = data;
        const sql = `
            INSERT INTO users (email, password_hash, username, first_name, last_name)
            VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, global_role;
        `;
        const values = [email, password_hash, username, first_name, last_name];
        const { rows } = await db.query(sql, values);
        return rows[0];
    }

    /**
    * @desc    Update a user's profile information
    * @route   Model Method
    * @access  Private
    */
    static async update(id, { username, first_name, last_name }) {

        const { rows } = await db.query(
            `
            UPDATE users
            SET username = COALESCE($1, username),
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name)
            WHERE id = $4
            RETURNING id, username, first_name, last_name, email, global_role;
        `,
            [username, first_name, last_name, id]
        );
        return rows[0];

    }

    /**
    * @desc    Update a user's profile picture
    * @route   Model Method
    * @access  Private
    */
    static async updatePicture(id, url) {
        const { rows } = await db.query(
            `UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING profile_picture_url;`,
            [url, id]
        );
        return rows[0];
    }

    /**
    * @desc    Get user profile with social stats
    * @route   Model Method
    * @access  Private
    */
    static async getProfileWithStats(targetUserId, viewerId = null) {
        const sql = `
        SELECT 
            u.id, u.username, u.profile_picture_url, u.created_at,
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
            -- Check if the viewer is currently following this user
            EXISTS (
                SELECT 1 FROM follows 
                WHERE follower_id = $2 AND following_id = u.id
            ) AS is_followed_by_me,
            -- Calculate post karma (upvotes - downvotes for user's posts)
            COALESCE((
                SELECT SUM(
                    (SELECT COUNT(*) FROM votes WHERE post_id = p.id AND vote_value = 1) -
                    (SELECT COUNT(*) FROM votes WHERE post_id = p.id AND vote_value = -1)
                )
                FROM posts p
                WHERE p.author_id = u.id AND p.is_deleted = false
            ), 0) AS post_karma,
            -- Calculate comment karma (sum of comment scores)
            COALESCE((
                SELECT SUM(score)
                FROM comments c
                WHERE c.author_id = u.id AND c.is_deleted = false
            ), 0) AS comment_karma,
            -- Count published posts
            (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND status = 'published' AND is_deleted = false) AS posts_count
        FROM users u
        WHERE u.id = $1;
    `;
        const { rows } = await db.query(sql, [targetUserId, viewerId]);
        if (rows[0]) {
            // Calculate total karma
            rows[0].karma = (parseInt(rows[0].post_karma) || 0) + (parseInt(rows[0].comment_karma) || 0);
        }
        return rows[0];
    }

    /**
    * @desc    Check if a user is following another user
    * @route   Model Method
    * @access  Private
    */
    static async isFollowing(followerId, followingId) {
        const sql = `
        SELECT 1 FROM follows
        WHERE follower_id = $1 AND following_id = $2
        `;
        const { rows } = await db.query(sql, [followerId, followingId]);
        return rows.length > 0;
    }

    /**
    * @desc    Follow a user
    * @route   Model Method
    * @access  Private
    */
    static async follow(followerId, followingId) {
        const sql = `
        INSERT INTO follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING *
        `;
        const { rows } = await db.query(sql, [followerId, followingId]);
        return rows[0];
    }

    /**
    * @desc    Unfollow a user
    * @route   Model Method
    * @access  Private
    */
    static async unfollow(followerId, followingId) {
        const sql = `
        DELETE FROM follows
        WHERE follower_id = $1 AND following_id = $2
        RETURNING *
        `;
        const { rows } = await db.query(sql, [followerId, followingId]);
        return rows[0];
    }

    /**
    * @desc    Get users that the specific user is following
    * @route   Model Method
    * @access  Private
    */
    static async getFollowing(userId) {
        const sql = `
        SELECT u.id, u.username, u.profile_picture_url, f.created_at as followed_at
        FROM users u
        JOIN follows f ON u.id = f.following_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC;
    `;
        const { rows } = await db.query(sql, [userId]);
        return rows;
    }

    /**
    * @desc    Get users that are following the specific user
    * @route   Model Method
    * @access  Private
    */
    static async getFollowers(userId) {
        const sql = `
        SELECT u.id, u.username, u.profile_picture_url, f.created_at as followed_at
        FROM users u
        JOIN follows f ON u.id = f.follower_id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC;
    `;
        const { rows } = await db.query(sql, [userId]);
        return rows;
    }

    /**
    * @desc    Delete a user
    * @route   Model Method
    * @access  Private
    */
    static async delete(id) {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        return true;
    }

    /**
     * @desc    Get a user by ID
     * @route   Model Method
     * @access  Private
     */
    static async findById(id) {
        const { rows } = await db.query('SELECT id, username, email, global_role, profile_picture_url FROM users WHERE id = $1', [id]);
        return rows[0];
    }

    /**
     * @desc    Get a user by email
     * @route   Model Method
     * @access  Private
     */
    static async findByEmail(email) {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0];
    }

    /**
     * @desc    Get a user by username
     * @route   Model Method
     * @access  Private
     */
    static async findByUsername(username) {
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        return rows[0];
    }

    /**
     * @desc    Check if a user is banned
     * @route   Model Method
     * @access  Private
     */
    static async isBanned(userId) {
        const { rows } = await db.query('SELECT is_banned FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) {
            return null; // User not found
        }
        return rows[0].is_banned;
    }

    /**
    * @desc    Generate JWT token for a user
    * @route   Model Method
    * @access  Private
    */
    static generateToken(id, role) {
        return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '3d' });
    }
}

module.exports = User;