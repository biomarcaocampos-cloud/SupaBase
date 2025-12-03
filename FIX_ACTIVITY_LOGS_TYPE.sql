-- ============================================
-- CORREÇÃO FINAL 2: Type em Activity Logs
-- Data: 2025-11-26 23:14
-- ============================================

-- O código usa a coluna 'action', mas a coluna antiga 'type' ainda existe e é obrigatória.
-- Vamos remover a obrigatoriedade de 'type'.

ALTER TABLE activity_logs 
ALTER COLUMN type DROP NOT NULL;

-- Opcional: Se quiser manter os dados consistentes, podemos copiar action para type
-- UPDATE activity_logs SET type = action WHERE type IS NULL;
