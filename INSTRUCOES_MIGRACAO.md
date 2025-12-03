# 🔧 INSTRUÇÕES: Como Executar a Migração do Banco de Dados

## 📋 **PASSO A PASSO**

### **1. Abrir o Supabase SQL Editor**

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral esquerdo, clique em **"SQL Editor"**

---

### **2. Executar o Script de Migração**

1. **Abra o arquivo** `fix_database_schema.sql` (está na pasta do projeto)
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no SQL Editor** do Supabase
4. **Clique em "Run"** (ou pressione `Ctrl+Enter`)

---

### **3. Verificar os Resultados**

Após executar, você verá 3 tabelas com as colunas listadas:

✅ **waiting_tickets** - deve mostrar as colunas:
- `call_time` (timestamp)
- `wait_time` (integer)
- `desk_id` (integer)
- `attendant_name` (text)

✅ **called_history** - deve mostrar as colunas:
- `desk_id` (integer)
- `timestamp` (bigint)

✅ **completed_services** - deve mostrar as colunas:
- `service_type` (text)
- `service` (text)

---

### **4. Após Executar a Migração**

**Me avise aqui** e eu vou:
1. ✅ Atualizar o código do `server.js` para usar os nomes corretos
2. ✅ Testar novamente o fluxo completo
3. ✅ Verificar se os dados estão sendo salvos corretamente

---

## ⚠️ **IMPORTANTE**

- Este script é **SEGURO** - usa `ADD COLUMN IF NOT EXISTS`
- **NÃO vai apagar** nenhum dado existente
- **NÃO vai modificar** colunas que já existem
- Apenas **adiciona** as colunas que estão faltando

---

## 🆘 **SE DER ERRO**

Se aparecer algum erro ao executar:
1. **Copie a mensagem de erro completa**
2. **Me envie aqui**
3. Vou ajustar o script conforme necessário

---

**Pronto para executar?** Execute a migração e me avise quando terminar! 🚀
