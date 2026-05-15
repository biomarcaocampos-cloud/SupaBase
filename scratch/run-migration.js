require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
    connectionString: connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

const migrationSql = `
    CREATE SEQUENCE IF NOT EXISTS agenda_controle_id_seq;
    ALTER TABLE agenda ADD COLUMN IF NOT EXISTS controle_id INTEGER DEFAULT nextval('agenda_controle_id_seq');
    ALTER TABLE agenda ADD COLUMN IF NOT EXISTS usuario_registro VARCHAR(100);
`;

async function run() {
    try {
        console.log('🔄 Iniciando migração do banco...');
        const client = await pool.connect();
        await client.query(migrationSql);
        console.log('✅ Migração concluída com sucesso!');
        client.release();
    } catch (err) {
        console.error('❌ Erro na migração:', err.message);
    } finally {
        await pool.end();
    }
}

run();
