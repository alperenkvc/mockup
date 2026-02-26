const db = require('../config/db');

class Search{
    /**
     * @desc    Search for users, communities, and custom feeds
     * @route   Model Method
     * @access  Public
     */
    static async searchAll(searchTerm) {
        const client = await db.connect();
        
        try {
          const query = `
            SELECT * FROM (
              SELECT id, username AS display_name, 'User' AS type, 
                     similarity(username, $1) AS score,
                     CASE 
                        WHEN username = $1 THEN 1 
                        WHEN username ILIKE $1 || '%' THEN 2 
                        ELSE 3 
                     END AS rank
              FROM users 
              WHERE username % $1 OR username ILIKE '%' || $1 || '%'
              
              UNION ALL
              
              SELECT id, community_name AS display_name, 'Community' AS type, 
                     similarity(community_name, $1) AS score,
                     CASE 
                        WHEN community_name = $1 THEN 1 
                        WHEN community_name ILIKE $1 || '%' THEN 2 
                        ELSE 3 
                     END AS rank
              FROM communities 
              WHERE community_name % $1 OR community_name ILIKE '%' || $1 || '%'
              
              UNION ALL
              
              SELECT id, feed_name AS display_name, 'Custom Feed' AS type, 
                     similarity(feed_name, $1) AS score,
                     CASE 
                        WHEN feed_name = $1 THEN 1 
                        WHEN feed_name ILIKE $1 || '%' THEN 2 
                        ELSE 3 
                     END AS rank
              FROM custom_feeds 
              WHERE feed_name % $1 OR feed_name ILIKE '%' || $1 || '%'
            ) AS results
            WHERE score > 0.1
            ORDER BY rank ASC, score DESC
            LIMIT 15;
          `;
      
          const { rows } = await client.query(query, [searchTerm]);
          return rows;
        } catch (err) {
          throw err;
        } finally {
          client.release();
        }
      };
}

module.exports = Search;