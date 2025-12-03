
## 👨‍💻 **Como Continuar Desenvolvendo**

1. **Iniciar o Backend:**
   ```bash
   node server.js
   ```

2. **Iniciar o Frontend:**
   ```bash
   npm run dev
   ```

3. **Testar a API:**
   ```bash
   # Criar ticket
   curl -X POST http://localhost:3002/api/tickets \
     -H "Content-Type: application/json" \
     -d '{"type":"NORMAL","service":"Teste"}'
   
   # Registrar usuário
   curl -X POST http://localhost:3002/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"username":"teste","password":"123","fullName":"Teste Silva"}'
   ```

---

**Status Geral:** ✅ **Sistema Funcional** - Pronto para testes e melhorias!
