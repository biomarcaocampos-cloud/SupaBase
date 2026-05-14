require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixDb() {
    const client = await pool.connect();
    try {
        console.log('🔧 Iniciando correções no banco de dados...\n');

        // 1. Verificar senha do usuário master
        const userResult = await client.query(
            "SELECT id, username, full_name, password, role FROM users WHERE username = '16991433829'"
        );
        if (userResult.rows.length > 0) {
            const u = userResult.rows[0];
            console.log(`✅ Usuário master encontrado: ${u.full_name}`);
            console.log(`   Senha atual: "${u.password}"`);
            
            // Garante que a senha seja '123' em texto plano
            if (u.password !== '123') {
                await client.query(
                    "UPDATE users SET password = '123' WHERE username = '16991433829'"
                );
                console.log('✅ Senha atualizada para "123"');
            } else {
                console.log('✅ Senha já está correta (123)');
            }
        } else {
            console.log('⚠️ Usuário master não encontrado! Criando...');
            await client.query(`
                INSERT INTO users (username, password, full_name, cpf, role, status)
                VALUES ('16991433829', '123', 'Master Manager', '169.914.338-29', 'admin', 'ATIVO')
            `);
            console.log('✅ Usuário master criado com senha "123"');
        }

        // 2. Limpar current_ticket_info das mesas (pode estar corrompido como string JSON)
        const desksResult = await client.query('SELECT id, current_ticket_info FROM service_desks');
        console.log(`\n📋 Verificando ${desksResult.rows.length} mesas...`);
        
        for (const desk of desksResult.rows) {
            if (desk.current_ticket_info !== null) {
                // Se for string, é um dado corrompido — limpar
                if (typeof desk.current_ticket_info === 'string') {
                    console.log(`   Mesa ${desk.id}: current_ticket_info é STRING (corrompida), limpando...`);
                    await client.query(
                        'UPDATE service_desks SET current_ticket = NULL, current_ticket_info = NULL, service_start_time = NULL WHERE id = $1',
                        [desk.id]
                    );
                } else {
                    console.log(`   Mesa ${desk.id}: current_ticket_info é objeto OK ✅ - ticket: ${desk.current_ticket_info?.number || 'null'}`);
                }
            }
        }

        console.log('\n✅ Correções concluídas com sucesso!');
        console.log('➡️  Reinicie o servidor (Ctrl+C + node server.js) para aplicar as mudanças do código.');
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixDb();
