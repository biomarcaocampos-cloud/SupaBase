# 🧪 TESTE: Verificar Atualização de Status e Colunas

## 📋 **PREPARAÇÃO**

1. ✅ Migração do banco executada
2. ✅ Logs adicionados no frontend e backend
3. ✅ Servidor backend rodando (porta 3002)
4. ✅ Frontend rodando (porta 3000)

---

## 🎯 **TESTE 1: Chamar uma Senha**

### **Passo a passo:**

1. **Abra 3 janelas lado a lado:**
   - 🌐 Navegador com o frontend (http://localhost:3000)
   - 🖥️ Console do navegador (F12 → aba Console)
   - 📟 Terminal do servidor backend

2. **Gere uma senha nova:**
   - Clique em "Emitir Senha Normal" ou "Emitir Senha Preferencial"
   - Anote o número da senha (ex: N016)

3. **Faça login em uma mesa:**
   - Vá para a tela de atendimento
   - Faça login em qualquer mesa

4. **Chame a senha:**
   - Clique em "Chamar Normal" ou "Chamar Preferencial"

---

## 🔍 **O QUE OBSERVAR**

### **No Console do Navegador (F12):**

Deve aparecer:
```
🔄 [FRONTEND] Atualizando status do ticket...
   Ticket: N016
   Status: CHAMANDO
   Call Time: 2025-11-26T22:31:00.000Z
   Wait Time: 12345
   Desk ID: 1
   Attendant: Seu Nome
✅ [FRONTEND] Status atualizado com sucesso!
```

### **No Terminal do Servidor:**

Deve aparecer:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 PATCH /api/tickets/:id - Dados recebidos:
   ID: N016
   Status: CHAMANDO
   Call Time: 2025-11-26T22:31:00.000Z
   Wait Time: 12345
   Desk ID: 1
   Attendant Name: Seu Nome
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ call_time será atualizado: ...
✅ wait_time será atualizado: ...
✅ desk_id será atualizado: ...
✅ attendant_name será atualizado: ...
🔍 Query SQL: UPDATE waiting_tickets SET ...
✅ Ticket atualizado com sucesso: {...}
```

---

## ✅ **VERIFICAR NO SUPABASE**

1. Abra o Supabase Dashboard
2. Vá em "Table Editor"
3. Abra a tabela `waiting_tickets`
4. Procure pela senha que você chamou (ex: N016)
5. **Verifique se as colunas foram preenchidas:**
   - ✅ `status` = "CHAMANDO"
   - ✅ `call_time` = data/hora
   - ✅ `wait_time` = número (milissegundos)
   - ✅ `desk_id` = número da mesa
   - ✅ `attendant_name` = seu nome

---

## 📸 **RESULTADO ESPERADO**

Se tudo estiver correto, você verá:

| ticket_number | status    | call_time           | wait_time | desk_id | attendant_name |
|---------------|-----------|---------------------|-----------|---------|----------------|
| N016          | CHAMANDO  | 2025-11-26 22:31:00 | 12345     | 1       | Seu Nome       |

---

## 🆘 **SE DER ERRO**

### **Se NÃO aparecer logs no console do navegador:**
→ O frontend não está executando a atualização
→ Me envie um print da tela

### **Se NÃO aparecer logs no terminal do servidor:**
→ A requisição não está chegando ao backend
→ Verifique se o servidor está rodando na porta 3002

### **Se aparecer erro no console:**
→ Copie a mensagem de erro completa
→ Me envie aqui

---

## 🚀 **EXECUTE O TESTE AGORA**

1. Reinicie o servidor backend (Ctrl+C e depois `node server.js`)
2. Recarregue o frontend (F5 no navegador)
3. Execute o teste conforme descrito acima
4. **Me envie os logs** que aparecerem (pode ser print ou texto)

---

**Pronto para testar!** 🎯
