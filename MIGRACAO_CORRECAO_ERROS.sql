-- ============================================
-- MIGRAÇÃO DE CORREÇÃO DE ERROS
-- Data: 2025-11-26 23:10
-- Objetivo: Corrigir erros de colunas inexistentes e constraints NOT NULL
-- ============================================

-- ============================================
-- 1. CORREÇÃO TABELA: agenda
-- ============================================
-- O código espera as colunas 'date' e 'time', mas o banco pode ter outros nomes.
-- Vamos adicionar as colunas esperadas pelo código.

ALTER TABLE agenda 
ADD COLUMN IF NOT EXISTS date VARCHAR(20),
ADD COLUMN IF NOT EXISTS time VARCHAR(10),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS service_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS documents TEXT[];

-- Se as colunas antigas existirem, podemos migrar os dados (opcional, mas seguro)
-- UPDATE agenda SET date = TO_CHAR(TO_TIMESTAMP(data_agendamento / 1000), 'YYYY-MM-DD') WHERE date IS NULL AND data_agendamento IS NOT NULL;
-- UPDATE agenda SET time = horario WHERE time IS NULL AND horario IS NOT NULL;

-- ============================================
-- 2. CORREÇÃO TABELA: activity_logs
-- ============================================
-- O erro indica que 'id' não pode ser nulo e o insert não fornece id.
-- Vamos garantir que o ID seja gerado automaticamente.

-- Primeiro, precisamos da extensão pgcrypto para gerar UUIDs se ainda não existir
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alterar a coluna id para ter um valor padrão
ALTER TABLE activity_logs 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- ============================================
-- 3. CORREÇÃO TABELA: called_history
-- ============================================
-- O erro indica que 'timestamp' não pode ser nulo e o insert não fornece.
-- Vamos definir um valor padrão.

ALTER TABLE called_history 
ALTER COLUMN timestamp SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

-- ============================================
-- 4. OUTRAS CORREÇÕES PREVENTIVAS
-- ============================================

-- Garantir que completed_services tenha valores padrão ou aceite nulos onde o código não envia
ALTER TABLE completed_services 
ALTER COLUMN completed_timestamp SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

-- Garantir que abandoned_tickets tenha valores padrão
ALTER TABLE abandoned_tickets 
ALTER COLUMN abandoned_timestamp SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
