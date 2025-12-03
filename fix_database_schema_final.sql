-- ============================================
-- MIGRAÇÃO FINAL: Padronizar Nomes de Colunas
-- Data: 2025-11-26 22:46
-- Objetivo: Garantir que todas as colunas existem com os nomes corretos
-- ============================================

-- ============================================
-- 1. TABELA: called_history
-- ============================================

-- Adicionar created_at se não existir (padrão Supabase)
ALTER TABLE called_history 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar timestamp se não existir (usado pelo backend)
ALTER TABLE called_history 
ADD COLUMN IF NOT EXISTS timestamp BIGINT;

-- Se timestamp estiver NULL, copiar de created_at
UPDATE called_history 
SET timestamp = EXTRACT(EPOCH FROM created_at) * 1000 
WHERE timestamp IS NULL AND created_at IS NOT NULL;

-- ============================================
-- 2. VERIFICAR TODAS AS TABELAS
-- ============================================

-- Listar colunas de called_history
SELECT 'called_history' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'called_history'
ORDER BY ordinal_position;

-- Listar colunas de completed_services
SELECT 'completed_services' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'completed_services'
ORDER BY ordinal_position;

-- Listar colunas de activity_logs
SELECT 'activity_logs' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- Listar colunas de waiting_tickets
SELECT 'waiting_tickets' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'waiting_tickets'
ORDER BY ordinal_position;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
