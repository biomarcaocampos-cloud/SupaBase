-- ============================================
-- MIGRAÇÃO: Correção de Schema do Banco de Dados
-- Data: 2025-11-26
-- Objetivo: Corrigir colunas faltantes nas tabelas de histórico
-- ============================================

-- ============================================
-- 1. CORRIGIR TABELA: called_history
-- ============================================

-- Adicionar coluna desk_id (se não existir)
ALTER TABLE called_history 
ADD COLUMN IF NOT EXISTS desk_id INTEGER;

-- Adicionar coluna timestamp (se não existir)
ALTER TABLE called_history 
ADD COLUMN IF NOT EXISTS timestamp BIGINT;

-- Comentários nas colunas
COMMENT ON COLUMN called_history.desk_id IS 'ID da mesa que chamou a senha';
COMMENT ON COLUMN called_history.timestamp IS 'Timestamp Unix (milissegundos) de quando a senha foi chamada';

-- ============================================
-- 2. CORRIGIR TABELA: completed_services
-- ============================================

-- Adicionar coluna service_type (se não existir)
ALTER TABLE completed_services 
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Adicionar coluna service (se não existir) - nome correto usado pelo backend
ALTER TABLE completed_services 
ADD COLUMN IF NOT EXISTS service TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN completed_services.service_type IS 'DEPRECATED: Use coluna "service"';
COMMENT ON COLUMN completed_services.service IS 'Tipo de serviço atendido (TRIAGEM, ATERMACAO, etc)';

-- ============================================
-- 3. VERIFICAR TABELA: waiting_tickets
-- ============================================

-- Garantir que as colunas de rastreamento existem
ALTER TABLE waiting_tickets 
ADD COLUMN IF NOT EXISTS call_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE waiting_tickets 
ADD COLUMN IF NOT EXISTS wait_time INTEGER;

ALTER TABLE waiting_tickets 
ADD COLUMN IF NOT EXISTS desk_id INTEGER;

ALTER TABLE waiting_tickets 
ADD COLUMN IF NOT EXISTS attendant_name TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN waiting_tickets.call_time IS 'Timestamp de quando a senha foi chamada';
COMMENT ON COLUMN waiting_tickets.wait_time IS 'Tempo de espera em milissegundos';
COMMENT ON COLUMN waiting_tickets.desk_id IS 'ID da mesa que atendeu';
COMMENT ON COLUMN waiting_tickets.attendant_name IS 'Nome do atendente';

-- ============================================
-- 4. VERIFICAR ÍNDICES (OPCIONAL - PERFORMANCE)
-- ============================================

-- Índice para busca por data na tabela waiting_tickets
CREATE INDEX IF NOT EXISTS idx_waiting_tickets_created_at 
ON waiting_tickets(created_at);

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_waiting_tickets_status 
ON waiting_tickets(status);

-- Índice para busca por data + status (consultas filtradas)
CREATE INDEX IF NOT EXISTS idx_waiting_tickets_date_status 
ON waiting_tickets(DATE(created_at), status);

-- ============================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================

-- Listar todas as colunas da tabela waiting_tickets
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'waiting_tickets'
ORDER BY ordinal_position;

-- Listar todas as colunas da tabela called_history
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'called_history'
ORDER BY ordinal_position;

-- Listar todas as colunas da tabela completed_services
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_services'
ORDER BY ordinal_position;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
