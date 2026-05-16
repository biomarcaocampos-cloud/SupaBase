require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function clearDb() {
    try {
        console.log('Iniciando limpeza do banco de dados...');
        await pool.query('TRUNCATE TABLE waiting_tickets, called_history, completed_services, abandoned_tickets RESTART IDENTITY CASCADE;');
        console.log('Banco de dados limpo com sucesso!');
        process.exit(0);
    } catch (e) {
        console.error('Erro ao limpar banco de dados:', e);
        process.exit(1);
    }
}

clearDb();
