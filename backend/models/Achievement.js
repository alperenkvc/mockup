const db = require('../config/db');

class Achievement{
     /**
     * @desc    Get all achievements
     * @route   Model Method
     * @access  Private
     */
    static async getAll() {
        const { rows } = await db.query('SELECT * FROM achievements ORDER BY id ASC');
        return rows;
    }

     /**
     * @desc    Get a specific achievement by ID
     * @route   Model Method
     * @access  Private
     */
    static async findById(id) {
        const { rows } = await db.query('SELECT * FROM achievements WHERE id = $1', [id]);
        return rows[0];
    }
}

module.exports = Achievement;