const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Iniciando limpeza total do banco de dados...');
    
    await client.query('BEGIN');
    
    const tables = [
      'waiting_tickets',
      'called_history',
      'completed_services',
      'abandoned_tickets',
      'agenda',
      'activity_logs'
    ];

    for (const table of tables) {
      console.log(`🧹 Limpando tabela: ${table}...`);
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }

    console.log('🖥️ Resetando estado das mesas (service_desks)...');
    await client.query(`
      UPDATE service_desks SET 
        current_ticket = NULL, 
        current_ticket_info = NULL, 
        service_start_time = NULL
    `);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Banco de dados limpo com sucesso!');
    
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ ERRO ao limpar banco:', e.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

clearDatabase();
