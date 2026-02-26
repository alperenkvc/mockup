const Search = require('../models/Search');

const getGlobalResults = async (req, res) => {
    const { q } = req.query;
  
    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }
  
    try {
      const searchTerm = q.trim();
      const results = await Search.searchAll(searchTerm);
      res.status(200).json(results);
    } catch (err) {
      console.error("Global Search Controller Error:", err.message);
      res.status(500).json({ error: "An error occurred while searching." });
    }
  };
  
  module.exports = { getGlobalResults };