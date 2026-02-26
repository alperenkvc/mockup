const Achievement = require('../models/Achievement');

/**
 * @desc    Get all achievements
 * @route   GET /api/achievements
 * @access  Public
 * @isTested true
 */
const getAllAchievements = async (req, res) => {
    try{
        const achievements = await Achievement.getAll();
        res.status(200).json(achievements);
    }catch (error){
        console.error('Error fetching achievements list:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    getAllAchievements
}