-- ============================================
-- SCHEMA COMPLETO DO SISTEMA DE SENHAS JEC
-- ============================================

-- Tabela de usuários (já existe, mas vamos garantir que está completa)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    cpf VARCHAR(14) UNIQUE,
    profile_picture TEXT,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'ATIVO',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Tabela de senhas/tickets (já existe)
CREATE TABLE IF NOT EXISTS waiting_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(10) NOT NULL,
    ticket_type VARCHAR(20) NOT NULL,
    service VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'AGUARDANDO',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sequências para tickets (já existem)
CREATE SEQUENCE IF NOT EXISTS normal_ticket_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS preferential_ticket_sequence START 1;

-- ============================================
-- NOVAS TABELAS BASEADAS NO LOCALSTORAGE
-- ============================================

-- Tabela de histórico de chamadas
CREATE TABLE IF NOT EXISTS called_history (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(10) NOT NULL,
    desk_number INTEGER NOT NULL,
    ticket_type VARCHAR(20) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_called_history_ticket ON called_history(ticket_number);
CREATE INDEX IF NOT EXISTS idx_called_history_desk ON called_history(desk_number);

-- Tabela de serviços completados
CREATE TABLE IF NOT EXISTS completed_services (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(10) NOT NULL,
    desk_id INTEGER NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    service_duration BIGINT NOT NULL,
    wait_time BIGINT NOT NULL,
    completed_timestamp BIGINT NOT NULL,
    service VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completed_services_ticket ON completed_services(ticket_number);
CREATE INDEX IF NOT EXISTS idx_completed_services_desk ON completed_services(desk_id);
CREATE INDEX IF NOT EXISTS idx_completed_services_user ON completed_services(user_id);

-- Tabela de senhas abandonadas
CREATE TABLE IF NOT EXISTS abandoned_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(10) NOT NULL,
    desk_id INTEGER NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    called_timestamp BIGINT NOT NULL,
    abandoned_timestamp BIGINT NOT NULL,
    ticket_type VARCHAR(20) NOT NULL,
    wait_time BIGINT NOT NULL,
    service VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_tickets_ticket ON abandoned_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_abandoned_tickets_desk ON abandoned_tickets(desk_id);

-- Tabela de mesas de atendimento (estado atual)
CREATE TABLE IF NOT EXISTS service_desks (
    id INTEGER PRIMARY KEY,
    user_id VARCHAR(50),
    user_display_name VARCHAR(100),
    current_ticket VARCHAR(10),
    current_ticket_info JSONB,
    service_start_time BIGINT,
    services TEXT[], -- Array de serviços
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    timestamp BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    duration BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);

-- Tabela de agenda
CREATE TABLE IF NOT EXISTS agenda (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(10) NOT NULL,
    nome_completo VARCHAR(200) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    email VARCHAR(100),
    data_agendamento BIGINT NOT NULL,
    horario VARCHAR(10) NOT NULL,
    servico VARCHAR(100) NOT NULL,
    observacoes TEXT,
    documentos_necessarios TEXT[],
    data_do_registro BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'AGENDADO',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agenda_ticket ON agenda(ticket_number);
CREATE INDEX IF NOT EXISTS idx_agenda_cpf ON agenda(cpf);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON agenda(status);
CREATE INDEX IF NOT EXISTS idx_agenda_data ON agenda(data_agendamento);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO system_config (config_key, config_value) VALUES
('tips', '["Consulte seu processo regularmente no site do Tribunal de Justiça.", "Prazos são importantes. Perder um prazo pode levar à extinção do seu processo."]'),
('alert_message', '')
ON CONFLICT (config_key) DO NOTHING;

-- Tabela de histórico arquivado (por dia)
CREATE TABLE IF NOT EXISTS archived_history (
    id SERIAL PRIMARY KEY,
    date_key VARCHAR(20) NOT NULL,
    completed_services JSONB,
    abandoned_tickets JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_history_date ON archived_history(date_key);

-- ============================================
-- INSERIR USUÁRIO MASTER PADRÃO
-- ============================================

-- Senha: 123 (em base64: MTIz)
INSERT INTO users (username, password, full_name, cpf, role, status)
VALUES ('16991433829', 'MTIz', 'Master Manager', '169.914.338-29', 'admin', 'ATIVO')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- INICIALIZAR MESAS DE ATENDIMENTO
-- ============================================

-- Criar 20 mesas vazias
INSERT INTO service_desks (id, user_id, user_display_name, current_ticket, current_ticket_info, service_start_time, services)
SELECT 
    generate_series AS id,
    NULL AS user_id,
    NULL AS user_display_name,
    NULL AS current_ticket,
    NULL AS current_ticket_info,
    NULL AS service_start_time,
    ARRAY[]::TEXT[] AS services
FROM generate_series(1, 20)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE waiting_tickets IS 'Senhas em espera na fila';
COMMENT ON TABLE called_history IS 'Histórico de senhas chamadas';
COMMENT ON TABLE completed_services IS 'Serviços completados com sucesso';
COMMENT ON TABLE abandoned_tickets IS 'Senhas que foram chamadas mas não atendidas';
COMMENT ON TABLE service_desks IS 'Estado atual das mesas de atendimento';
COMMENT ON TABLE activity_logs IS 'Logs de login/logout dos usuários';
COMMENT ON TABLE agenda IS 'Agendamentos de atendimento';
COMMENT ON TABLE system_config IS 'Configurações gerais do sistema';
COMMENT ON TABLE archived_history IS 'Histórico arquivado por dia';

-- ============================================
-- FUNÇÕES ÚTEIS
-- ============================================

-- Função para limpar dados antigos (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM called_history WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    DELETE FROM archived_history WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
END;
$$ LANGUAGE plpgsql;

-- Função para resetar o sistema (novo dia)
CREATE OR REPLACE FUNCTION reset_daily_system()
RETURNS void AS $$
BEGIN
    -- Arquivar dados do dia anterior
    INSERT INTO archived_history (date_key, completed_services, abandoned_tickets)
    SELECT 
        TO_CHAR(NOW() - INTERVAL '1 day', 'YYYY-MM-DD'),
        jsonb_agg(DISTINCT cs.*),
        jsonb_agg(DISTINCT at.*)
    FROM completed_services cs
    FULL OUTER JOIN abandoned_tickets at ON true
    WHERE cs.created_at::date = (NOW() - INTERVAL '1 day')::date
       OR at.created_at::date = (NOW() - INTERVAL '1 day')::date;
    
    -- Limpar senhas antigas
    DELETE FROM waiting_tickets WHERE status IN ('CHAMANDO', 'ATENDENDO', 'FINALIZADO');
    
    -- Resetar mesas
    UPDATE service_desks SET 
        current_ticket = NULL,
        current_ticket_info = NULL,
        service_start_time = NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View de estatísticas do dia
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    COUNT(DISTINCT cs.id) as completed_count,
    COUNT(DISTINCT at.id) as abandoned_count,
    AVG(cs.service_duration) as avg_service_duration,
    AVG(cs.wait_time) as avg_wait_time,
    COUNT(DISTINCT cs.desk_id) as active_desks
FROM completed_services cs
LEFT JOIN abandoned_tickets at ON at.created_at::date = cs.created_at::date
WHERE cs.created_at::date = CURRENT_DATE;

-- View de senhas em espera
CREATE OR REPLACE VIEW waiting_queue AS
SELECT 
    ticket_number,
    ticket_type,
    service,
    status,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) as wait_seconds
FROM waiting_tickets
WHERE status = 'AGUARDANDO'
ORDER BY 
    CASE WHEN ticket_type = 'PREFERENCIAL' THEN 0 ELSE 1 END,
    created_at;

COMMENT ON VIEW daily_stats IS 'Estatísticas do dia atual';
COMMENT ON VIEW waiting_queue IS 'Fila de senhas em espera ordenada por prioridade';
