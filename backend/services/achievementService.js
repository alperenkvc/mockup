const UserAchievement = require('../models/UserAchievement');

const checkPostAchievements = async (userId, count) => {
    if (count === 1) await UserAchievement.assign(userId, 1); // Author I
    if (count === 10) await UserAchievement.assign(userId, 2); // Author II
    if (count === 100) await UserAchievement.assign(userId, 3); // Author III
};

module.exports = checkPostAchievements;