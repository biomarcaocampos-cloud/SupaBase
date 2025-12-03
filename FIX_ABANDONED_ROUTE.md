# CORREÇÃO URGENTE: Rota POST /api/abandoned-tickets

## Problema
O botão "Não Compareceu" não está funcionando porque a rota do servidor está usando campos antigos que não existem no banco de dados.

**Erro**: `column "service_type" of relation "abandoned_tickets" does not exist`

## Solução

Abra o arquivo `server.js` e localize a linha **631** (busque por `app.post('/api/abandoned-tickets'`).

### Código ATUAL (INCORRETO):
```javascript
// POST abandoned tickets
app.post('/api/abandoned-tickets', async (req, res) => {
    const { ticket_number, service_type, desk_id, user_name, notes } = req.body;
    try {
        if (dbReady) {
            const result = await pool.query(
                'INSERT INTO abandoned_tickets (ticket_number, service_type, desk_id, user_name, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [ticket_number, service_type, desk_id, user_name, notes]
            );
            return res.status(201).json(result.rows[0]);
        } else {
            return res.status(503).json({ error: 'Banco de dados não disponível.' });
        }
    } catch (error) {
        console.error('Erro ao salvar ticket abandonado:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});
```

### Código CORRETO (substituir por este):
```javascript
// POST abandoned tickets
app.post('/api/abandoned-tickets', async (req, res) => {
    const { ticket_number, desk_id, user_id, user_name, called_timestamp, abandoned_timestamp, ticket_type, wait_time, service } = req.body;
    try {
        if (dbReady) {
            const result = await pool.query(
                `INSERT INTO abandoned_tickets 
                (ticket_number, desk_id, user_id, user_name, called_timestamp, abandoned_timestamp, ticket_type, wait_time, service) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                RETURNING *`,
                [ticket_number, desk_id, user_id, user_name, called_timestamp, abandoned_timestamp, ticket_type, wait_time, service]
            );
            console.log(`✅ Ticket abandonado salvo: ${ticket_number}`);
            return res.status(201).json(result.rows[0]);
        } else {
            return res.status(503).json({ error: 'Banco de dados não disponível.' });
        }
    } catch (error) {
        console.error('Erro ao salvar ticket abandonado:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});
```

## Passos para aplicar a correção:

1. Abra o arquivo `server.js`
2. Pressione `Ctrl+F` e busque por: `app.post('/api/abandoned-tickets'`
3. Substitua todo o bloco (linhas 630-647) pelo código correto acima
4. Salve o arquivo (`Ctrl+S`)
5. Reinicie o servidor Node.js

## Após a correção:

O botão "Não Compareceu" irá:
- ✅ Atualizar o status do ticket para "ABANDONADA"
- ✅ Salvar no histórico de tickets abandonados
- ✅ Limpar a mesa para próxima chamada
- ✅ Calcular corretamente o tempo de espera
