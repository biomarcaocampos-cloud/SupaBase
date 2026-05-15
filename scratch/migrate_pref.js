const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🚀 Iniciando migração...');
    await pool.query('ALTER TABLE service_desks ADD COLUMN IF NOT EXISTS preferential_only BOOLEAN DEFAULT FALSE;');
    console.log('✅ Coluna preferential_only adicionada com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await pool.end();
  }
}

migrate();
