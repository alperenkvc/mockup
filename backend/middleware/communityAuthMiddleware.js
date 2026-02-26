const db = require('../config/db');

/**
 * @desc    Check if user is a moderator of a community
 * @route   Middleware
 * @access  Private
 */
const isModerator = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const communityId = req.params.id;

        const sql = `
            SELECT community_role FROM community_members 
            WHERE user_id = $1 AND community_id = $2 AND status = 'approved';
        `;
        const { rows } = await db.query(sql, [userId, communityId]);

        if (rows.length === 0 || rows[0].community_role !== 'moderator') {
            return res.status(403).json({
                message: 'Forbidden: You do not have moderator privileges for this community.'
            });
        }

        next(); // User is a moderator, proceed to controller
    } catch (error) {
        res.status(500).json({ message: 'Server error during authorization' });
    }
};

module.exports = { isModerator };