-- ============================================
-- CORREÇÃO FINAL: Timestamp em Activity Logs
-- Data: 2025-11-26 23:12
-- ============================================

-- O código não envia 'timestamp' ao salvar logs, então o banco deve gerar automaticamente.
-- Vamos definir o valor padrão como o tempo atual em milissegundos (Epoch).

ALTER TABLE activity_logs 
ALTER COLUMN timestamp SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

-- Opcional: Remover constraint NOT NULL para evitar erros futuros se algo falhar
ALTER TABLE activity_logs 
ALTER COLUMN timestamp DROP NOT NULL;
