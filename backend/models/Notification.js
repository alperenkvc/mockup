const db = require('../config/db');

class Notification {
    constructor(data) {
        this.id = data.id;
        this.recipient_id = data.recipient_id;
        this.sender_id = data.sender_id;
        this.type = data.type;
        this.entity_id = data.entity_id;
        this.comment_id = data.comment_id || null;
        this.is_read = data.is_read || false;
        this.created_at = data.created_at;
        // Joined fields
        this.sender_username = data.sender_username || null;
        this.sender_avatar = data.sender_avatar || null;
        this.community_name = data.community_name || null;
    }

    /**
     * @desc    Create a new notification
     * @route   Model Method
     * @access  Public/Private
     */
    static async create({ recipient_id, sender_id, type, entity_id, comment_id = null }) {
        const client = await db.connect();

        try {
            // Check if comment_id column exists by trying to insert without it first
            // If comment_id is provided and column exists, include it; otherwise omit it
            let query, values;
            if (comment_id !== null) {
                // Try with comment_id first
                query = `
                    INSERT INTO notifications (recipient_id, sender_id, type, entity_id, comment_id)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                values = [recipient_id, sender_id, type, entity_id, comment_id];
            } else {
                // Without comment_id
                query = `
                    INSERT INTO notifications (recipient_id, sender_id, type, entity_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *;
                `;
                values = [recipient_id, sender_id, type, entity_id];
            }
            
            const { rows } = await client.query(query, values);
            return new Notification(rows[0]);
        } catch (err) {
            // If comment_id column doesn't exist, retry without it
            if (err.code === '42703' && comment_id !== null) {
                try {
                    const query = `
                        INSERT INTO notifications (recipient_id, sender_id, type, entity_id)
                        VALUES ($1, $2, $3, $4)
                        RETURNING *;
                    `;
                    const values = [recipient_id, sender_id, type, entity_id];
                    const { rows } = await client.query(query, values);
                    return new Notification(rows[0]);
                } catch (retryErr) {
                    console.error('Error in Notification.create (retry):', retryErr);
                    throw retryErr;
                }
            } else {
                console.error('Error in Notification.create:', err);
                throw err;
            }
        } finally {
            client.release();
        }
    }

    /**
     * @desc    Get notifications for a user
     * @route   Model Method
     * @access  Public/Private
     */
    static async findByUserId(userId, limit = 20) {
        const client = await db.connect();
        try {
            const query = `
                SELECT 
                    n.*, 
                    u.username AS sender_username, 
                    u.profile_picture_url AS sender_avatar,
                    CASE 
                        WHEN n.type IN ('MEMBER_JOINED', 'MEMBERSHIP_APPROVED', 'MODERATOR_PROMOTED') 
                        THEN c.community_name 
                        ELSE NULL 
                    END AS community_name
                FROM notifications n
                LEFT JOIN users u ON n.sender_id = u.id
                LEFT JOIN communities c ON n.type IN ('MEMBER_JOINED', 'MEMBERSHIP_APPROVED', 'MODERATOR_PROMOTED') 
                    AND n.entity_id = c.id
                WHERE n.recipient_id = $1
                ORDER BY n.created_at DESC
                LIMIT $2;
            `;
            const { rows } = await client.query(query, [userId, limit]);
            return rows.map(row => {
                const notification = new Notification(row);
                if (row.community_name) {
                    notification.community_name = row.community_name;
                }
                return notification;
            });
        } catch (err) {
            console.error('Error in Notification.findByUserId:', err);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * @desc    Get unread notification count for a user
     * @route   Model Method
     * @access  Private
     */
    static async getUnreadCount(userId) {
        const sql = `
            SELECT COUNT(*) as count
            FROM notifications
            WHERE recipient_id = $1 AND is_read = FALSE;
        `;
        const { rows } = await db.query(sql, [userId]);
        return parseInt(rows[0].count, 10);
    }

    /**
     * @desc    Mark a notification as read
     * @route   Model Method
     * @access  Public/Private
     */
    static async markAsRead(notificationId, userId) {
        const client = await db.connect();
        try {
            const query = `
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE id = $1 AND recipient_id = $2 
                RETURNING *;
            `;
            const { rows } = await client.query(query, [notificationId, userId]);
            return rows[0] ? new Notification(rows[0]) : null;
        } catch (err) {
            console.error('Error in Notification.markAsRead:', err);
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = Notification;