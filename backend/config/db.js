const { Pool } = require('pg');
require('dotenv').config();

// Create a config object
const poolConfig = process.env.DATABASE_URL 
  ? {
      // PRODUCTION (Render)
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Render Postgres
      }
    }
  : {
      // LOCAL (Windows/Docker)
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: String(process.env.DB_PASSWORD),
      port: parseInt(process.env.DB_PORT, 10),
    };

const pool = new Pool(poolConfig);

// Keep your debug logs clean
console.log(process.env.DATABASE_URL ? "Connected via DATABASE_URL" : "Connected via local variables");

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;