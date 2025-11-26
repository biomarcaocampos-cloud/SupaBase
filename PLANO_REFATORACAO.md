# 🔄 PLANO DE REFATORAÇÃO - REMOVER LOCALSTORAGE

**Objetivo:** Migrar completamente de localStorage para Supabase como única fonte de dados.

---

## 📋 ETAPAS DA REFATORAÇÃO

### ✅ **ETAPA 1: Criar Tabelas no Supabase** (CONCLUÍDA)

Arquivo criado: `database_schema.sql`

**Execute no SQL Editor do Supabase:**
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de `database_schema.sql`
4. Execute (Run)

**Tabelas que serão criadas:**
- ✅ `users` (já existe, será atualizada)
- ✅ `waiting_tickets` (já existe)
- ✅ `called_history` (nova)
- ✅ `completed_services` (nova)
- ✅ `abandoned_tickets` (nova)
- ✅ `service_desks` (nova)
- ✅ `activity_logs` (nova)
- ✅ `agenda` (nova)
- ✅ `system_config` (nova)
- ✅ `archived_history` (nova)

---

### 🔧 **ETAPA 2: Atualizar Backend (server.js)**

**Novas rotas a adicionar:**

#### Rotas de Histórico
- `GET /api/called-history` - Listar histórico de chamadas
- `POST /api/called-history` - Adicionar chamada ao histórico

#### Rotas de Serviços Completados
- `GET /api/completed-services` - Listar serviços completados
- `POST /api/completed-services` - Registrar serviço completado

#### Rotas de Senhas Abandonadas
- `GET /api/abandoned-tickets` - Listar senhas abandonadas
- `POST /api/abandoned-tickets` - Registrar senha abandonada
- `DELETE /api/abandoned-tickets/:ticketNumber` - Remover (reinserir)

#### Rotas de Mesas
- `GET /api/desks` - Listar todas as mesas
- `GET /api/desks/:id` - Buscar mesa específica
- `PATCH /api/desks/:id` - Atualizar mesa (login/logout/ticket)

#### Rotas de Agenda
- `GET /api/agenda` - Listar agendamentos
- `POST /api/agenda` - Criar agendamento
- `PATCH /api/agenda/:id` - Atualizar agendamento
- `DELETE /api/agenda/:id` - Cancelar agendamento

#### Rotas de Configuração
- `GET /api/config/:key` - Buscar configuração
- `PUT /api/config/:key` - Atualizar configuração

#### Rotas de Logs
- `GET /api/activity-logs` - Listar logs de atividade
- `POST /api/activity-logs` - Registrar log

---

### 🎨 **ETAPA 3: Refatorar Frontend**

#### 3.1 Remover storageService
- ❌ Deletar `services/storageService.ts`

#### 3.2 Refatorar AuthContext
**Mudanças:**
- ❌ Remover `storageService.getUsers()`
- ❌ Remover `storageService.saveUsers()`
- ❌ Remover usuário Master local
- ✅ Buscar usuários via `GET /api/users`
- ✅ Login via `POST /api/users/login`
- ✅ Manter apenas `sessionStorage` para sessão atual

#### 3.3 Refatorar QueueContext
**Mudanças:**
- ❌ Remover `storageService.getQueueState()`
- ❌ Remover `storageService.saveQueueState()`
- ❌ Remover `storageService.archiveDay()`
- ✅ Buscar estado via APIs
- ✅ Atualizar estado via APIs
- ✅ Manter apenas estado React (sem persistência local)

#### 3.4 Criar novo serviço: `apiService.ts`
**Funções:**
```typescript
// Users
export const fetchUsers = () => fetch('/api/users')
export const loginUser = (cpf, password) => fetch('/api/users/login', ...)
export const registerUser = (data) => fetch('/api/users/register', ...)

// Tickets
export const fetchTickets = () => fetch('/api/tickets')
export const createTicket = (type, service) => fetch('/api/tickets', ...)

// Desks
export const fetchDesks = () => fetch('/api/desks')
export const updateDesk = (id, data) => fetch('/api/desks/:id', ...)

// History
export const fetchCalledHistory = () => fetch('/api/called-history')
export const fetchCompletedServices = () => fetch('/api/completed-services')
export const fetchAbandonedTickets = () => fetch('/api/abandoned-tickets')

// Agenda
export const fetchAgenda = () => fetch('/api/agenda')
export const createAgendaEntry = (data) => fetch('/api/agenda', ...)

// Config
export const fetchConfig = (key) => fetch('/api/config/:key')
export const updateConfig = (key, value) => fetch('/api/config/:key', ...)
```

---

## 🎯 ORDEM DE EXECUÇÃO

### **Passo 1:** Execute o SQL no Supabase ✅
```sql
-- Cole o conteúdo de database_schema.sql
```

### **Passo 2:** Atualizar Backend
1. Adicionar todas as novas rotas em `server.js`
2. Testar cada rota com Postman/curl

### **Passo 3:** Criar apiService
1. Criar `services/apiService.ts`
2. Implementar todas as funções de API

### **Passo 4:** Refatorar AuthContext
1. Remover localStorage
2. Usar apiService
3. Testar login/registro

### **Passo 5:** Refatorar QueueContext
1. Remover localStorage
2. Usar apiService
3. Testar emissão/chamada de senhas

### **Passo 6:** Deletar storageService
1. Remover arquivo
2. Remover imports

### **Passo 7:** Testes Finais
1. Testar todo o fluxo
2. Verificar persistência no Supabase
3. Confirmar que não há localStorage

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Sessão do Usuário:** Manter `sessionStorage` para usuário logado
2. **Performance:** Implementar cache em memória se necessário
3. **Offline:** Sistema não funcionará offline (aceitável para este caso)
4. **Migração:** Dados antigos do localStorage serão perdidos (ok, começar limpo)

---

## ✅ BENEFÍCIOS

1. ✅ **Fonte única de verdade** - Apenas Supabase
2. ✅ **Sincronização** - Múltiplos dispositivos
3. ✅ **Escalabilidade** - Pronto para produção
4. ✅ **Backup** - Automático no Supabase
5. ✅ **Sem conflitos** - Elimina dessincronização

---

## 📊 PROGRESSO

- [x] Criar schema SQL
- [ ] Executar SQL no Supabase
- [ ] Atualizar backend com novas rotas
- [ ] Criar apiService
- [ ] Refatorar AuthContext
- [ ] Refatorar QueueContext
- [ ] Deletar storageService
- [ ] Testes finais

---

**Status:** Aguardando execução do SQL no Supabase para prosseguir.
