// Server for JEC Ticket System
console.log('---------------------------------------------------');
console.log('--- INICIALIZANDO SERVIDOR DO SISTEMA DE SENHAS ---');
console.log('---------------------------------------------------');

// Carrega as variáveis de ambiente do arquivo .env
try {
    require('dotenv').config();
} catch (e) {
    console.log('INFO: Biblioteca dotenv não carregada. Verifique se instalou: npm install dotenv');
}

let express, Pool, cors;
try {
    express = require('express');
    const pg = require('pg');
    Pool = pg.Pool;
    cors = require('cors');
    console.log('✅ Bibliotecas carregadas com sucesso.');
} catch (e) {
    console.error('❌ ERRO CRÍTICO: Falha ao carregar bibliotecas.');
    console.error('Execute no terminal: npm install express pg cors dotenv');
    process.exit(1);
}

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// Variáveis para Modo Memória (Fallback)
let localWaitList = [];
let localNormalCount = 0;
let localPrefCount = 0;

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
let pool = null;
let dbReady = false;
const connectionString = process.env.DATABASE_URL;

async function init() {
    if (!connectionString) {
        console.warn('⚠️  AVISO: DATABASE_URL não encontrada no .env – rodando em modo memória.');
        startServer();
        return;
    }

    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    console.log('🔄 Tentando conectar ao Banco de Dados...');

    pool = new Pool({
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false } // SSL para Supabase
    });

    try {
        const client = await pool.connect();
        console.log(isLocalhost ? '💻 Detectado ambiente Localhost.' : '☁️  Detectado ambiente Nuvem – habilitando SSL.');

        // Verifica conexão e tabelas
        const res = await client.query('SELECT NOW()');
        console.log('✅ SUCESSO: Conectado ao PostgreSQL!');

        // Verifica contagem de tickets
        const countRes = await client.query('SELECT COUNT(*) FROM waiting_tickets');
        console.log(`📊 Status: ${countRes.rows[0].count} senhas registradas no banco.`);

        client.release();
        dbReady = true;
    } catch (err) {
        console.error('❌ ERRO DE CONEXÃO:', err.message);
        console.log('⚠️  O servidor rodará em modo memória (sem persistência).');
    }

    startServer();
}

function startServer() {
    app.listen(port, () => {
        console.log(`🚀 Servidor rodando em: http://localhost:${port}`);
        if (dbReady) {
            console.log('🔗 Conectando ao banco... aguarde.');
        } else {
            console.log('⚠️  ATENÇÃO: Rodando sem banco de dados.');
        }
    });

    // Rota de teste
    app.get('/', (req, res) => {
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
                <h1 style="color: #4caf50;">Sistema de Senhas JEC - Online 🟢</h1>
                <p>Status do Banco de Dados: <strong>${dbReady ? 'CONECTADO ✅' : 'DESCONECTADO ❌'}</strong></p>
                <p style="margin-bottom: 2rem;">Endpoint API: http://localhost:${port}/api/tickets</p>
            </div>
        `);
    });

    // POST - Create new ticket
    app.post('/api/tickets', async (req, res) => {
        const { type, service } = req.body;
        if (!type || !service) {
            return res.status(400).json({ error: 'Dados inválidos.' });
        }
        try {
            let ticketNumberStr;
            if (dbReady) {
                const sequenceName = type === 'NORMAL' ? 'normal_ticket_sequence' : 'preferential_ticket_sequence';
                const nextValRes = await pool.query(`SELECT nextval('${sequenceName}')`);
                const nextVal = nextValRes.rows[0].nextval;
                const prefix = type === 'NORMAL' ? 'N' : 'P';
                ticketNumberStr = `${prefix}${String(nextVal).padStart(3, '0')}`;
                const insertQuery = `
                    INSERT INTO waiting_tickets (ticket_number, ticket_type, service, status)
                    VALUES ($1, $2, $3, 'AGUARDANDO')
                    RETURNING *;`;
                const result = await pool.query(insertQuery, [ticketNumberStr, type, service]);
                console.log(`[SUPABASE/DB] Nova senha gerada: ${ticketNumberStr} (${service})`);
                return res.status(201).json(result.rows[0]);
            } else {
                if (type === 'NORMAL') {
                    localNormalCount++;
                    ticketNumberStr = `N${String(localNormalCount).padStart(3, '0')}`;
                } else {
                    localPrefCount++;
                    ticketNumberStr = `P${String(localPrefCount).padStart(3, '0')}`;
                }
                const newTicket = {
                    id: Date.now(),
                    ticket_number: ticketNumberStr,
                    ticket_type: type,
                    service: service,
                    created_at: new Date(),
                    status: 'AGUARDANDO'
                };
                localWaitList.push(newTicket);
                console.log(`[MEMÓRIA] Nova senha: ${ticketNumberStr}`);
                return res.status(201).json(newTicket);
            }
        } catch (error) {
            console.error('Erro no servidor:', error);
            res.status(500).json({ error: 'Erro interno ao gerar senha.' });
        }
    });

    // ---------- CRUD ROUTES ----------

    // GET all tickets (with optional pagination & status filter)
    app.get('/api/tickets', async (req, res) => {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        try {
            if (dbReady) {
                let query = `SELECT * FROM waiting_tickets`;
                const params = [];
                if (status) {
                    params.push(status);
                    query += ` WHERE status = $${params.length}`;
                }
                query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
                params.push(limit, offset);
                const result = await pool.query(query, params);
                return res.json({ tickets: result.rows, page: Number(page), limit: Number(limit) });
            } else {
                // memory mode – filter & paginate in‑memory
                let filtered = localWaitList;
                if (status) filtered = filtered.filter(t => t.status === status);
                const paginated = filtered.slice(offset, offset + Number(limit));
                return res.json({ tickets: paginated, page: Number(page), limit: Number(limit) });
            }
        } catch (e) {
            console.error('Erro ao listar tickets:', e);
            res.status(500).json({ error: 'Erro interno ao listar tickets.' });
        }
    });

    // GET ticket by ID
    app.get('/api/tickets/:id', async (req, res) => {
        const { id } = req.params;
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM waiting_tickets WHERE id = $1', [id]);
                if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket não encontrado.' });
                return res.json(result.rows[0]);
            } else {
                const ticket = localWaitList.find(t => t.id == id);
                if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
                return res.json(ticket);
            }
        } catch (e) {
            console.error('Erro ao buscar ticket:', e);
            res.status(500).json({ error: 'Erro interno ao buscar ticket.' });
        }
    });

    // PATCH ticket (e.g., update status)
    app.patch('/api/tickets/:id', async (req, res) => {
        const { id } = req.params;
        const { status, call_time, wait_time, desk_id, attendant_name } = req.body;

        if (!status) return res.status(400).json({ error: 'Campo status é obrigatório.' });

        try {
            if (dbReady) {
                const updates = ['status = $1'];
                const params = [status];
                let paramCount = 2;

                if (call_time) {
                    updates.push(`call_time = $${paramCount++}`);
                    params.push(new Date(call_time));
                }
                if (wait_time) {
                    updates.push(`wait_time = $${paramCount++}`);
                    params.push(wait_time);
                }
                if (desk_id) {
                    updates.push(`desk_id = $${paramCount++}`);
                    params.push(desk_id);
                }
                if (attendant_name) {
                    updates.push(`attendant_name = $${paramCount++}`);
                    params.push(attendant_name);
                }

                let whereClause;
                // Se for numérico puro, assume ID, senão assume ticket_number (ex: N001)
                if (/^\d+$/.test(id)) {
                    whereClause = `id = $${paramCount}`;
                } else {
                    whereClause = `ticket_number = $${paramCount}`;
                }
                params.push(id);

                const query = `UPDATE waiting_tickets SET ${updates.join(', ')} WHERE ${whereClause} RETURNING *`;
                const result = await pool.query(query, params);

                if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket não encontrado.' });
                return res.json(result.rows[0]);
            } else {
                const ticket = localWaitList.find(t => t.id == id || t.ticket_number == id);
                if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
                ticket.status = status;
                if (call_time) ticket.call_time = call_time;
                if (wait_time) ticket.wait_time = wait_time;
                if (desk_id) ticket.desk_id = desk_id;
                if (attendant_name) ticket.attendant_name = attendant_name;
                return res.json(ticket);
            }
        } catch (e) {
            console.error('Erro ao atualizar ticket:', e);
            res.status(500).json({ error: 'Erro interno ao atualizar ticket.', details: e.message });
        }
    });

    // DELETE ticket
    app.delete('/api/tickets/:id', async (req, res) => {
        const { id } = req.params;
        try {
            if (dbReady) {
                const result = await pool.query('DELETE FROM waiting_tickets WHERE id = $1 RETURNING *', [id]);
                if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket não encontrado.' });
                return res.json({ message: 'Ticket removido.', ticket: result.rows[0] });
            } else {
                const index = localWaitList.findIndex(t => t.id == id);
                if (index === -1) return res.status(404).json({ error: 'Ticket não encontrado.' });
                const [removed] = localWaitList.splice(index, 1);
                return res.json({ message: 'Ticket removido.', ticket: removed });
            }
        } catch (e) {
            console.error('Erro ao remover ticket:', e);
            res.status(500).json({ error: 'Erro interno ao remover ticket.' });
        }
    });

    // ---------- END CRUD ----------

    // ---------- USER ROUTES ----------

    // POST - Register new user
    app.post('/api/users/register', async (req, res) => {
        const { username, password, fullName, email, cpf, profilePicture } = req.body;

        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'Campos obrigatórios: username, password, fullName' });
        }

        try {
            if (dbReady) {
                // Check if username already exists
                const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
                if (checkUser.rowCount > 0) {
                    return res.status(409).json({ error: 'Nome de usuário já existe.' });
                }

                // Insert new user
                const insertQuery = `
                    INSERT INTO users (username, password, full_name, email, cpf, profile_picture, role)
                    VALUES ($1, $2, $3, $4, $5, $6, 'user')
                    RETURNING id, username, full_name, email, cpf, profile_picture, role, created_at;`;

                const result = await pool.query(insertQuery, [username, password, fullName, email, cpf, profilePicture]);
                console.log(`[SUPABASE/DB] Novo usuário registrado: ${username}`);
                return res.status(201).json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível. Modo memória não suporta usuários.' });
            }
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
        }
    });

    // POST - Login
    app.post('/api/users/login', async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e password são obrigatórios.' });
        }

        try {
            if (dbReady) {
                // CORREÇÃO: Adicionado campo 'status' ao SELECT
                const result = await pool.query(
                    'SELECT id, username, full_name, email, cpf, profile_picture, role, status, created_at FROM users WHERE username = $1 AND password = $2',
                    [username, password]
                );

                if (result.rowCount === 0) {
                    return res.status(401).json({ error: 'Credenciais inválidas.' });
                }

                console.log(`[SUPABASE/DB] Login bem-sucedido: ${username}`);
                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ error: 'Erro interno ao fazer login.' });
        }
    });

    // GET all users (admin only)
    app.get('/api/users', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query(
                    'SELECT id, username, full_name, email, cpf, profile_picture, role, status, created_at FROM users ORDER BY created_at DESC'
                );
                return res.json({ users: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).json({ error: 'Erro interno ao listar usuários.' });
        }
    });

    // PATCH user (update role/permissions)
    app.patch('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        const { role, fullName, email, cpf, status, password } = req.body;

        try {
            if (dbReady) {
                const updates = [];
                const params = [];
                let paramCount = 1;

                if (role) {
                    updates.push(`role = $${paramCount++}`);
                    params.push(role);
                }
                if (fullName) {
                    updates.push(`full_name = $${paramCount++}`);
                    params.push(fullName);
                }
                if (email !== undefined) {
                    updates.push(`email = $${paramCount++}`);
                    params.push(email);
                }
                if (cpf !== undefined) {
                    updates.push(`cpf = $${paramCount++}`);
                    params.push(cpf);
                }
                if (status) {
                    updates.push(`status = $${paramCount++}`);
                    params.push(status);
                }
                if (password) {
                    updates.push(`password = $${paramCount++}`);
                    params.push(password);
                }

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
                }

                params.push(id);
                const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, full_name, email, cpf, profile_picture, role, status, created_at`;

                const result = await pool.query(query, params);

                if (result.rowCount === 0) {
                    return res.status(404).json({ error: 'Usuário não encontrado.' });
                }

                console.log(`[SUPABASE/DB] Usuário atualizado: ${result.rows[0].username}`);
                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
        }
    });

    // DELETE user
    app.delete('/api/users/:id', async (req, res) => {
        const { id } = req.params;

        try {
            if (dbReady) {
                const result = await pool.query(
                    'DELETE FROM users WHERE id = $1 RETURNING username',
                    [id]
                );

                if (result.rowCount === 0) {
                    return res.status(404).json({ error: 'Usuário não encontrado.' });
                }

                console.log(`[SUPABASE/DB] Usuário removido: ${result.rows[0].username}`);
                return res.json({ message: 'Usuário removido com sucesso.' });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
            res.status(500).json({ error: 'Erro interno ao remover usuário.' });
        }
    });

    // ---------- END USER ROUTES ----------

    // ---------- DESK ROUTES ----------

    // GET all desks
    app.get('/api/desks', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM service_desks ORDER BY id');
                return res.json({ desks: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar mesas:', error);
            res.status(500).json({ error: 'Erro interno ao listar mesas.' });
        }
    });

    // GET desk by ID
    app.get('/api/desks/:id', async (req, res) => {
        const { id } = req.params;
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM service_desks WHERE id = $1', [id]);
                if (result.rowCount === 0) {
                    return res.status(404).json({ error: 'Mesa não encontrada.' });
                }
                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao buscar mesa:', error);
            res.status(500).json({ error: 'Erro interno ao buscar mesa.' });
        }
    });

    // PATCH desk (login/logout/update)
    app.patch('/api/desks/:id', async (req, res) => {
        const { id } = req.params;
        const { user_id, user_display_name, current_ticket, current_ticket_info, service_start_time, services } = req.body;

        try {
            if (dbReady) {
                const updates = [];
                const params = [];
                let paramCount = 1;

                if (user_id !== undefined) {
                    updates.push(`user_id = $${paramCount++}`);
                    params.push(user_id);
                }
                if (user_display_name !== undefined) {
                    updates.push(`user_display_name = $${paramCount++}`);
                    params.push(user_display_name);
                }
                if (current_ticket !== undefined) {
                    updates.push(`current_ticket = $${paramCount++}`);
                    params.push(current_ticket);
                }
                if (current_ticket_info !== undefined) {
                    updates.push(`current_ticket_info = $${paramCount++}`);
                    params.push(JSON.stringify(current_ticket_info));
                }
                if (service_start_time !== undefined) {
                    updates.push(`service_start_time = $${paramCount++}`);
                    params.push(service_start_time);
                }
                if (services !== undefined) {
                    updates.push(`services = $${paramCount++}`);
                    params.push(services);
                }

                updates.push(`updated_at = NOW()`);
                params.push(id);

                const query = `UPDATE service_desks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
                const result = await pool.query(query, params);

                if (result.rowCount === 0) {
                    return res.status(404).json({ error: 'Mesa não encontrada.' });
                }

                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao atualizar mesa:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar mesa.' });
        }
    });

    // ---------- END DESK ROUTES ----------

    // ---------- HISTORY ROUTES ----------

    // GET called history
    app.get('/api/called-history', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM called_history ORDER BY called_at DESC LIMIT 100');
                return res.json({ history: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar histórico de chamadas:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // POST called history
    app.post('/api/called-history', async (req, res) => {
        const { ticket_number, desk_id, desk_name } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'INSERT INTO called_history (ticket_number, desk_id, desk_name) VALUES ($1, $2, $3) RETURNING *',
                    [ticket_number, desk_id, desk_name]
                );
                return res.status(201).json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao salvar histórico de chamadas:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // GET completed services
    app.get('/api/completed-services', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM completed_services ORDER BY completed_at DESC LIMIT 100');
                return res.json({ services: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar serviços completados:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // POST completed services
    app.post('/api/completed-services', async (req, res) => {
        const { ticket_number, service_type, desk_id, user_name, notes, duration } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'INSERT INTO completed_services (ticket_number, service_type, desk_id, user_name, notes, duration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    [ticket_number, service_type, desk_id, user_name, notes, duration]
                );
                return res.status(201).json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao salvar serviço completado:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // GET abandoned tickets
    app.get('/api/abandoned-tickets', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM abandoned_tickets ORDER BY abandoned_at DESC LIMIT 100');
                return res.json({ tickets: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar tickets abandonados:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

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

    // DELETE abandoned ticket (restore)
    app.delete('/api/abandoned-tickets/:ticketNumber', async (req, res) => {
        const { ticketNumber } = req.params;
        try {
            if (dbReady) {
                const result = await pool.query('DELETE FROM abandoned_tickets WHERE ticket_number = $1 RETURNING *', [ticketNumber]);
                if (result.rowCount === 0) return res.status(404).json({ error: 'Ticket não encontrado.' });
                return res.json({ message: 'Ticket restaurado.', ticket: result.rows[0] });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao restaurar ticket:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // ---------- END HISTORY ROUTES ----------

    // ---------- AGENDA ROUTES ----------

    // GET agenda
    app.get('/api/agenda', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM agenda ORDER BY date, time');
                return res.json({ agenda: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar agenda:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // POST agenda
    app.post('/api/agenda', async (req, res) => {
        const { date, time, customer_name, service_type, notes, documents } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'INSERT INTO agenda (date, time, customer_name, service_type, notes, documents) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    [date, time, customer_name, service_type, notes, documents]
                );
                return res.status(201).json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // PATCH agenda
    app.patch('/api/agenda/:id', async (req, res) => {
        const { id } = req.params;
        const { status, notes } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'UPDATE agenda SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *',
                    [status, notes, id]
                );
                if (result.rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });
                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // DELETE agenda
    app.delete('/api/agenda/:id', async (req, res) => {
        const { id } = req.params;
        try {
            if (dbReady) {
                const result = await pool.query('DELETE FROM agenda WHERE id = $1 RETURNING *', [id]);
                if (result.rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });
                return res.json({ message: 'Agendamento removido.' });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao remover agendamento:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // ---------- END AGENDA ROUTES ----------

    // ---------- CONFIG ROUTES ----------

    // GET config
    app.get('/api/config/:key', async (req, res) => {
        const { key } = req.params;
        try {
            if (dbReady) {
                const result = await pool.query('SELECT config_value FROM system_config WHERE config_key = $1', [key]);
                if (result.rowCount === 0) return res.json({ value: null });
                return res.json({ value: result.rows[0].config_value });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao buscar configuração:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // PUT config
    app.put('/api/config/:key', async (req, res) => {
        const { key } = req.params;
        const { value } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'INSERT INTO system_config (config_key, config_value) VALUES ($1, $2) ON CONFLICT (config_key) DO UPDATE SET config_value = $2 RETURNING *',
                    [key, value]
                );
                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // ---------- END CONFIG ROUTES ----------

    // ---------- ACTIVITY LOG ROUTES ----------

    // GET activity logs
    app.get('/api/activity-logs', async (req, res) => {
        try {
            if (dbReady) {
                const result = await pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100');
                return res.json({ logs: result.rows });
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao listar logs:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // POST activity log
    app.post('/api/activity-logs', async (req, res) => {
        const { action, details, user_id, user_name } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'INSERT INTO activity_logs (action, details, user_id, user_name) VALUES ($1, $2, $3, $4) RETURNING *',
                    [action, JSON.stringify(details), user_id, user_name]
                );
                return res.status(201).json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao salvar log:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // ---------- END ACTIVITY LOG ROUTES ----------
}

// Inicializa o servidor
init();