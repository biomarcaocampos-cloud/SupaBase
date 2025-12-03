-- ============================================
-- MIGRAÇÃO COMPLEMENTAR: Adicionar Colunas Faltantes
-- Data: 2025-11-26 22:38
-- Objetivo: Adicionar colunas que ainda estão faltando
-- ============================================

-- ============================================
-- 1. TABELA: activity_logs
-- ============================================

ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS action TEXT;

COMMENT ON COLUMN activity_logs.action IS 'Tipo de ação realizada (LOGIN, LOGOUT, etc)';

-- ============================================
-- 2. TABELA: called_history
-- ============================================

ALTER TABLE called_history 
ADD COLUMN IF NOT EXISTS desk_name TEXT;

COMMENT ON COLUMN called_history.desk_name IS 'Nome/número da mesa que chamou';

-- ============================================
-- 3. TABELA: completed_services
-- ============================================

ALTER TABLE completed_services 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN completed_services.notes IS 'Observações sobre o atendimento';

-- ============================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar colunas da tabela activity_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- Verificar colunas da tabela called_history
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'called_history'
ORDER BY ordinal_position;

-- Verificar colunas da tabela completed_services
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_services'
ORDER BY ordinal_position;

-- ============================================
-- FIM DA MIGRAÇÃO COMPLEMENTAR
-- ============================================
