const { Pool } = require('pg');
require('dotenv').config();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
}
const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});
(async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to DB, applying column migrations...');
        await client.query(`ALTER TABLE waiting_tickets ADD COLUMN IF NOT EXISTS call_time TIMESTAMP;`);
        await client.query(`ALTER TABLE waiting_tickets ADD COLUMN IF NOT EXISTS wait_time INTEGER;`);
        await client.query(`ALTER TABLE waiting_tickets ADD COLUMN IF NOT EXISTS desk_id INTEGER;`);
        await client.query(`ALTER TABLE waiting_tickets ADD COLUMN IF NOT EXISTS attendant_name VARCHAR(100);`);
        console.log('Columns added (if they did not exist).');
        client.release();
        await pool.end();
    } catch (e) {
        console.error('Error applying migrations:', e);
        process.exit(1);
    }
})();
