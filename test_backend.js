// Teste de backend usando fetch nativo


async function testBackend() {
    const API_URL = 'http://localhost:3002/api/tickets';

    console.log('--- INICIANDO TESTE DE DIAGNÓSTICO DO BACKEND ---');

    try {
        // 1. Criar um ticket
        console.log('1. Tentando criar um ticket...');
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'NORMAL', service: 'TESTE' })
        });

        if (!createRes.ok) throw new Error(`Falha ao criar ticket: ${createRes.statusText}`);
        const ticket = await createRes.json();
        console.log('✅ Ticket criado:', ticket);

        // 2. Atualizar o ticket (Simulando "Chamar")
        console.log(`2. Tentando atualizar o ticket ${ticket.ticket_number} (ID: ${ticket.id})...`);
        const updateData = {
            status: 'CHAMANDO',
            call_time: new Date().toISOString(),
            wait_time: 5000,
            desk_id: 1,
            attendant_name: 'Tester'
        };

        // Tenta atualizar usando o ID numérico (como o frontend deveria fazer se tiver o ID)
        // OU usando o ticket_number se for o caso. O server deve aceitar ambos.
        const updateRes = await fetch(`${API_URL}/${ticket.ticket_number}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            throw new Error(`Falha ao atualizar ticket: ${errText}`);
        }

        const updatedTicket = await updateRes.json();
        console.log('✅ Resposta da atualização:', updatedTicket);

        // 3. Verificação
        if (updatedTicket.status === 'CHAMANDO' && updatedTicket.attendant_name === 'Tester') {
            console.log('🎉 SUCESSO! O backend está salvando os dados corretamente.');
            console.log('Se o frontend não funciona, verifique se o servidor foi reiniciado.');
        } else {
            console.error('❌ FALHA: O backend respondeu, mas os dados não conferem.');
            console.log('Recebido:', updatedTicket);
        }

    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('⚠️  O SERVIDOR NÃO ESTÁ RODANDO NA PORTA 3002.');
            console.log('Por favor, execute "node server.js" em outro terminal.');
        }
    }
}

// Polyfill simples para fetch se não existir (Node antigo)
if (!globalThis.fetch) {
    console.log('Ambiente sem fetch nativo, usando http...');
    const http = require('http');
    // ... implementação simplificada omitida, esperando que o usuário tenha Node recente ou o teste falhe avisando.
    // Na verdade, melhor avisar para rodar com node recente.
}

testBackend();
