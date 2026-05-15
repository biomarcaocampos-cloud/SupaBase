const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- Iniciando Migração: Adicionando coluna observations ---');
        await pool.query('ALTER TABLE waiting_tickets ADD COLUMN IF NOT EXISTS observations TEXT;');
        console.log('✅ SUCESSO: Coluna observations adicionada com sucesso!');
    } catch (err) {
        console.error('❌ ERRO na migração:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
