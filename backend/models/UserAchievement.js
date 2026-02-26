const db = require('../config/db');

class UserAchievement {
    /**
     * @desc Get achievements for a specific user
     */
    static async getByUserId(userId, limit = null) {
        const sql = `
            SELECT a.id, a.achievement_name, a.description, a.icon_url, ua.earned_at
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_id = $1
            ORDER BY ua.earned_at DESC
            LIMIT $2
        `;
        const safeLimit = limit != null
            ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100)
            : 100;

        const { rows } = await db.query(sql, [userId, safeLimit]);
        return rows;
    }

    /**
     * @desc Assign an achievement to a user
     */
    static async assign(userId, achievementId) {
        const sql = `
        WITH inserted AS (
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, achievement_id) DO NOTHING
            RETURNING *
        )
        SELECT 
            i.earned_at, 
            a.id, 
            a.achievement_name, 
            a.description, 
            a.icon_url
        FROM inserted i
        JOIN achievements a ON i.achievement_id = a.id;
    `;

        const { rows } = await db.query(sql, [userId, achievementId]);

        //Logic to handle if achievement was already assigned
        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = UserAchievement;