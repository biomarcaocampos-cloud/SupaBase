const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkLogs() {
  try {
    const res = await pool.query("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10");
    console.log('Ultimos 10 logs:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkLogs();
