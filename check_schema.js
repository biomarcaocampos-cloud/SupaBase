require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' ORDER BY ordinal_position")
  .then(r => { r.rows.forEach(c => console.log(c.column_name, c.data_type)); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
