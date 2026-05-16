require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDb() {
    try {
        const res = await pool.query('SELECT * FROM waiting_tickets ORDER BY created_at DESC LIMIT 5;');
        console.log('Tickets no banco:');
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error('Erro:', e);
        process.exit(1);
    }
}

checkDb();
