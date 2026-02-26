const calculatePopularity = (recentVotess, recentComments, totalScore, createdAt) => {
    const now = Date.now();
    const created = new Date(createdAt).getTime();

    const ageIn30MinBlocks = (now - created) / 1800000; //1800000 ms = 30 minutes

    const velocity = Number(recentVotess) + Number(recentComments);

    const decay = Number(totalScore) / Math.max(ageIn30MinBlocks, 0.1);

    return velocity + decay;
}

module.exports = { calculatePopularity };