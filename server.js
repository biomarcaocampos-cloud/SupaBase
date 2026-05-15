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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

        // Migração automática para a coluna compareceu_data
        try {
            await pool.query('ALTER TABLE agenda ADD COLUMN IF NOT EXISTS compareceu_data BIGINT');
            console.log('✅ Banco de Dados: Verificação de esquema concluída (compareceu_data).');
        } catch (e) {
            console.warn('⚠️  Aviso: Não foi possível verificar/adicionar a coluna compareceu_data (pode já existir).');
        }
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

    // Rota de status para o frontend
    app.get('/api/status', (req, res) => {
        res.json({ status: 'online', mode: dbReady ? 'database' : 'local' });
    });

    // POST - Create new ticket
    app.post('/api/tickets', async (req, res) => {
        const { type, service, observations } = req.body;
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
                    INSERT INTO waiting_tickets (ticket_number, ticket_type, service, status, observations)
                    VALUES ($1, $2, $3, 'AGUARDANDO', $4)
                    RETURNING *;`;
                const result = await pool.query(insertQuery, [ticketNumberStr, type, service, observations || null]);
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
                    observations: observations || null,
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
        const { role, full_name, email, cpf, status, password, profile_picture, adminId, adminName } = req.body;

        try {
            if (dbReady) {
                // Get current data for logging if status or password changes
                let currentUserData = null;
                if (status || password) {
                    const currentRes = await pool.query('SELECT username, full_name, status FROM users WHERE id = $1', [id]);
                    currentUserData = currentRes.rows[0];
                }

                const updates = [];
                const params = [];
                let paramCount = 1;

                if (role) { updates.push(`role = $${paramCount++}`); params.push(role); }
                if (full_name) { updates.push(`full_name = $${paramCount++}`); params.push(full_name); }
                if (email !== undefined) { updates.push(`email = $${paramCount++}`); params.push(email); }
                if (cpf !== undefined) { updates.push(`cpf = $${paramCount++}`); params.push(cpf); }
                if (status) { updates.push(`status = $${paramCount++}`); params.push(status); }
                if (password) { updates.push(`password = $${paramCount++}`); params.push(password); }
                if (profile_picture !== undefined) { updates.push(`profile_picture = $${paramCount++}`); params.push(profile_picture); }

                if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

                params.push(id);
                const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, full_name, email, cpf, profile_picture, role, status, created_at`;
                const result = await pool.query(query, params);

                if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

                // Log the change if it was status or password
                if (currentUserData && adminId) {
                    console.log(`[LOG] Iniciando gravação de log para ${id}. Admin: ${adminName} (${adminId})`);
                    if (status && status !== currentUserData.status) {
                        const logId = `status-${id}-${Date.now()}`;
                        const details = JSON.stringify({
                            oldStatus: currentUserData.status,
                            newStatus: status,
                            changedBy: adminId,
                            changedByName: adminName || 'Admin'
                        });
                        console.log(`[LOG] Gravando STATUS_CHANGE para ${id}`);
                        await pool.query(
                            'INSERT INTO activity_logs (id, user_id, user_name, timestamp, action, type, details) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                            [logId, id, currentUserData.full_name, Date.now(), 'STATUS_CHANGE', 'MANAGEMENT', details]
                        );
                    }
                    if (password) {
                        const logId = `pwd-${id}-${Date.now()}`;
                        const details = JSON.stringify({
                            changedBy: adminId,
                            changedByName: adminName || 'Admin'
                        });
                        console.log(`[LOG] Gravando PASSWORD_RESET para ${id}`);
                        await pool.query(
                            'INSERT INTO activity_logs (id, user_id, user_name, timestamp, action, type, details) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                            [logId, id, currentUserData.full_name, Date.now(), 'PASSWORD_RESET', 'MANAGEMENT', details]
                        );
                    }
                } else {
                    console.log(`[LOG] Pulo gravação de log. AdminId: ${adminId}, CurrentUserData: ${!!currentUserData}`);
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
        const { user_id, user_display_name, current_ticket, current_ticket_info, service_start_time, services, preferential_only } = req.body;

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
                    // Pass as plain object — pg handles JSONB conversion automatically.
                    // Using JSON.stringify would store it as an escaped string, breaking reads.
                    params.push(current_ticket_info === null ? null : current_ticket_info);
                }
                if (service_start_time !== undefined) {
                    updates.push(`service_start_time = $${paramCount++}`);
                    params.push(service_start_time);
                }
                if (services !== undefined) {
                    updates.push(`services = $${paramCount++}`);
                    params.push(services);
                }
                if (preferential_only !== undefined) {
                    updates.push(`preferential_only = $${paramCount++}`);
                    params.push(preferential_only);
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
                const result = await pool.query('SELECT * FROM called_history ORDER BY timestamp DESC LIMIT 100');
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
        const { ticket_number, desk_number, ticket_type, timestamp } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'INSERT INTO called_history (ticket_number, desk_number, ticket_type, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
                    [ticket_number, desk_number, ticket_type, timestamp]
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
        const { limit = 100, startDate, endDate } = req.query;
        try {
            if (dbReady) {
                let query = 'SELECT * FROM completed_services';
                const params = [];
                const conditions = [];

                if (startDate && endDate) {
                    conditions.push(`completed_timestamp BETWEEN $${params.length + 1} AND $${params.length + 2}`);
                    params.push(parseInt(startDate));
                    params.push(parseInt(endDate));
                }

                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }

                query += ` ORDER BY completed_timestamp DESC LIMIT $${params.length + 1}`;
                params.push(parseInt(limit));

                const result = await pool.query(query, params);
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
        const { ticket_number, desk_id, user_id, user_name, service_duration, wait_time, completed_timestamp, service } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    `INSERT INTO completed_services
                    (ticket_number, desk_id, user_id, user_name, service_duration, wait_time, completed_timestamp, service)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [ticket_number, desk_id, user_id, user_name, service_duration, wait_time, completed_timestamp, service]
                );
                console.log(`✅ Serviço completado salvo: ${ticket_number}`);
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
        const { limit = 100, startDate, endDate } = req.query;
        try {
            if (dbReady) {
                let query = 'SELECT * FROM abandoned_tickets';
                const params = [];
                const conditions = [];

                if (startDate && endDate) {
                    conditions.push(`abandoned_timestamp BETWEEN $${params.length + 1} AND $${params.length + 2}`);
                    params.push(parseInt(startDate));
                    params.push(parseInt(endDate));
                }

                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }

                query += ` ORDER BY abandoned_timestamp DESC LIMIT $${params.length + 1}`;
                params.push(parseInt(limit));

                const result = await pool.query(query, params);
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
        const { status } = req.query;
        try {
            if (dbReady) {
                let query = 'SELECT * FROM agenda';
                const params = [];
                if (status) {
                    query += ' WHERE status = $1';
                    params.push(status);
                }
                query += ' ORDER BY data_agendamento, horario';
                const result = await pool.query(query, params);
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
        const {
            id, ticket_number, nome_completo, cpf, telefone, email,
            data_agendamento, horario, servico, observacoes, documentos_necessarios, data_do_registro,
            usuario_registro
        } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    `INSERT INTO agenda (
                        id, ticket_number, nome_completo, cpf, telefone, email,
                        data_agendamento, horario, servico, observacoes, documentos_necessarios, data_do_registro,
                        usuario_registro
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
                    [id, ticket_number, nome_completo, cpf, telefone, email, data_agendamento, horario, servico, observacoes, documentos_necessarios, data_do_registro, usuario_registro]
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
        const { nome_completo, cpf, telefone, email, data_agendamento, horario, servico, observacoes, documentos_necessarios, status, compareceu_data } = req.body;
        try {
            if (dbReady) {
                const updates = [];
                const params = [];
                let n = 1;
                if (nome_completo !== undefined) { updates.push(`nome_completo = $${n++}`); params.push(nome_completo); }
                if (cpf !== undefined) { updates.push(`cpf = $${n++}`); params.push(cpf); }
                if (telefone !== undefined) { updates.push(`telefone = $${n++}`); params.push(telefone); }
                if (email !== undefined) { updates.push(`email = $${n++}`); params.push(email); }
                if (data_agendamento !== undefined) { updates.push(`data_agendamento = $${n++}`); params.push(data_agendamento); }
                if (horario !== undefined) { updates.push(`horario = $${n++}`); params.push(horario); }
                if (servico !== undefined) { updates.push(`servico = $${n++}`); params.push(servico); }
                if (observacoes !== undefined) { updates.push(`observacoes = $${n++}`); params.push(observacoes); }
                if (documentos_necessarios !== undefined) { updates.push(`documentos_necessarios = $${n++}`); params.push(documentos_necessarios); }
                if (status !== undefined) { updates.push(`status = $${n++}`); params.push(status); }
                if (req.body.usuario_registro !== undefined) { updates.push(`usuario_registro = $${n++}`); params.push(req.body.usuario_registro); }
                if (req.body.data_do_registro !== undefined) { updates.push(`data_do_registro = $${n++}`); params.push(req.body.data_do_registro); }
                if (compareceu_data !== undefined) { updates.push(`compareceu_data = $${n++}`); params.push(compareceu_data); }
                if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
                params.push(id);
                const result = await pool.query(`UPDATE agenda SET ${updates.join(', ')} WHERE id = $${n} RETURNING *`, params);
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
                const result = await pool.query("UPDATE agenda SET status = 'CANCELADO' WHERE id = $1 RETURNING *", [id]);
                if (result.rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado.' });
                return res.json({ message: 'Agendamento cancelado.', entry: result.rows[0] });
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
        const { user_id, limit } = req.query;
        try {
            if (dbReady) {
                let query = 'SELECT * FROM activity_logs';
                const params = [];
                if (user_id) {
                    query += ' WHERE user_id = $1';
                    params.push(user_id);
                }
                query += ` ORDER BY timestamp DESC LIMIT ${limit || 100}`;
                const result = await pool.query(query, params);
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
        const { id, user_id, user_name, timestamp, type, duration, action, details } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    `INSERT INTO activity_logs (id, user_id, user_name, timestamp, type, duration, action, details)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (id) DO UPDATE SET duration = EXCLUDED.duration, details = EXCLUDED.details
                     RETURNING *`,
                    [id, user_id, user_name, timestamp, type || null, duration || null, action || null, details || null]
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

    // PATCH activity log (update duration)
    app.patch('/api/activity-logs/:id', async (req, res) => {
        const { id } = req.params;
        const { duration } = req.body;
        try {
            if (dbReady) {
                const result = await pool.query(
                    'UPDATE activity_logs SET duration = $1 WHERE id = $2 RETURNING *',
                    [duration, id]
                );
                if (result.rowCount === 0) return res.status(404).json({ error: 'Log não encontrado.' });
                return res.json(result.rows[0]);
            } else {
                return res.status(503).json({ error: 'Banco de dados não disponível.' });
            }
        } catch (error) {
            console.error('Erro ao atualizar log:', error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // ---------- END ACTIVITY LOG ROUTES ----------
}

// Inicializa o servidor
init();