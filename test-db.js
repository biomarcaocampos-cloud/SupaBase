require('dotenv').config();
const { Pool } = require('pg');

console.log('=== TESTE DE CONEXÃO COM O BANCO DE DADOS ===\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERRO: DATABASE_URL não encontrada no arquivo .env');
    console.log('\nVerifique se o arquivo .env existe e contém:');
    console.log('DATABASE_URL=postgresql://...');
    process.exit(1);
}

console.log('✅ DATABASE_URL encontrada');
console.log('📝 String de conexão (parcial):', connectionString.substring(0, 30) + '...');

const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
console.log('🌐 Tipo de conexão:', isLocalhost ? 'Local' : 'Nuvem (Supabase/Neon)');

const pool = new Pool({
    connectionString: connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

console.log('\n🔄 Tentando conectar ao banco de dados...\n');

pool.connect()
    .then(client => {
        console.log('✅ SUCESSO: Conectado ao PostgreSQL!');
        
        // Testa se a tabela existe
        return client.query('SELECT count(*) FROM waiting_tickets')
            .then(res => {
                console.log(`✅ Tabela "waiting_tickets" encontrada!`);
                console.log(`📊 Total de registros: ${res.rows[0].count}`);
                client.release();
                pool.end();
                process.exit(0);
            })
            .catch(err => {
                if (err.code === '42P01') {
                    console.log('⚠️  Tabela "waiting_tickets" NÃO EXISTE');
                    console.log('\n📋 Você precisa criar a tabela no Supabase.');
                    console.log('Acesse: SQL Editor no Supabase Dashboard');
                } else {
                    console.error('❌ Erro ao consultar tabela:', err.message);
                }
                client.release();
                pool.end();
                process.exit(1);
            });
    })
    .catch(err => {
        console.error('❌ ERRO DE CONEXÃO:');
        console.error('Código:', err.code);
        console.error('Mensagem:', err.message);
        console.error('\n🔍 Possíveis causas:');
        console.error('  1. Senha incorreta no DATABASE_URL');
        console.error('  2. Projeto Supabase pausado ou inativo');
        console.error('  3. Firewall bloqueando a conexão');
        console.error('  4. URL de conexão inválida');
        pool.end();
        process.exit(1);
    });
