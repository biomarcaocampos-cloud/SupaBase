-- ============================================
-- MIGRAÇÃO COMPLEMENTAR: Corrigir Constraints e Colunas Faltantes
-- Data: 2025-11-26 23:00
-- ============================================

-- ============================================
-- 1. TABELA: abandoned_tickets
-- ============================================

ALTER TABLE abandoned_tickets 
ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 2. TABELA: called_history - Remover Constraints NOT NULL
-- ============================================

ALTER TABLE called_history 
ALTER COLUMN ticket_type DROP NOT NULL;

-- ============================================
-- 3. TABELA: completed_services - Remover Constraints NOT NULL
-- ============================================

ALTER TABLE completed_services 
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN user_name DROP NOT NULL,
ALTER COLUMN service_duration DROP NOT NULL,
ALTER COLUMN wait_time DROP NOT NULL,
ALTER COLUMN completed_timestamp DROP NOT NULL,
ALTER COLUMN service DROP NOT NULL;

-- ============================================
-- 4. VERIFICAÇÃO
-- ============================================

SELECT 'MIGRAÇÃO COMPLEMENTAR CONCLUÍDA' as status;

-- Listar constraints que ainda existem
SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('called_history', 'completed_services', 'abandoned_tickets')
ORDER BY table_name, ordinal_position;
