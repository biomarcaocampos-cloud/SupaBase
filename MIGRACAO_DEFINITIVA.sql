-- ============================================
-- MIGRAÇÃO DEFINITIVA: Adicionar TODAS as Colunas Faltantes
-- Data: 2025-11-26 22:53
-- Objetivo: Resolver TODOS os erros de schema de uma vez
-- ============================================

-- ============================================
-- 1. TABELA: waiting_tickets
-- ============================================

ALTER TABLE waiting_tickets 
ADD COLUMN IF NOT EXISTS call_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS wait_time INTEGER,
ADD COLUMN IF NOT EXISTS desk_id INTEGER,
ADD COLUMN IF NOT EXISTS attendant_name TEXT;

-- ============================================
-- 2. TABELA: called_history
-- ============================================

ALTER TABLE called_history 
ADD COLUMN IF NOT EXISTS desk_name TEXT,
ADD COLUMN IF NOT EXISTS desk_id INTEGER;

-- Remover constraint NOT NULL de desk_number se existir
ALTER TABLE called_history 
ALTER COLUMN desk_number DROP NOT NULL;

-- ============================================
-- 3. TABELA: completed_services
-- ============================================

ALTER TABLE completed_services 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT,
ADD COLUMN IF NOT EXISTS duration BIGINT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 4. TABELA: activity_logs
-- ============================================

ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS action TEXT,
ADD COLUMN IF NOT EXISTS details TEXT;

-- ============================================
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_waiting_tickets_status ON waiting_tickets(status);
CREATE INDEX IF NOT EXISTS idx_waiting_tickets_created_at ON waiting_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_waiting_tickets_desk_id ON waiting_tickets(desk_id);

CREATE INDEX IF NOT EXISTS idx_called_history_created_at ON called_history(created_at);
CREATE INDEX IF NOT EXISTS idx_completed_services_completed_at ON completed_services(completed_at);

-- ============================================
-- 6. VERIFICAÇÃO FINAL - LISTAR TODAS AS COLUNAS
-- ============================================

-- waiting_tickets
SELECT 'waiting_tickets' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'waiting_tickets'
ORDER BY ordinal_position;

-- called_history
SELECT 'called_history' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'called_history'
ORDER BY ordinal_position;

-- completed_services
SELECT 'completed_services' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'completed_services'
ORDER BY ordinal_position;

-- activity_logs
SELECT 'activity_logs' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- ============================================
-- FIM DA MIGRAÇÃO DEFINITIVA
-- ============================================
