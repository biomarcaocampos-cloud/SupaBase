-- ============================================
-- CORREÇÃO: Tabela Abandoned Tickets
-- Data: 2025-11-26 23:22
-- ============================================

-- O servidor não envia várias colunas que são obrigatórias (NOT NULL).
-- Vamos remover a obrigatoriedade dessas colunas para evitar erros 500.

ALTER TABLE abandoned_tickets 
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN called_timestamp DROP NOT NULL,
ALTER COLUMN ticket_type DROP NOT NULL,
ALTER COLUMN wait_time DROP NOT NULL,
ALTER COLUMN service DROP NOT NULL;

-- Garantir que abandoned_timestamp tenha valor padrão (caso não tenha sido aplicado antes)
ALTER TABLE abandoned_tickets 
ALTER COLUMN abandoned_timestamp SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
