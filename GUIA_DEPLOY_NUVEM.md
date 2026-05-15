# 🚀 Guia de Configuração em Nuvem (Deploy)

Este documento resume onde cada "chave" deve ser colocada para que o sistema funcione corretamente na internet.

---

## 🏗️ 1. RENDER (Onde mora o seu Servidor/Backend)
O Render mantém o seu arquivo `server.js` rodando 24h por dia.

**Onde configurar:** No painel do Render > Seu Projeto > Aba **Environment**.

| Chave (Key) | Valor (Value) | Para que serve? |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | `postgres://postgres.pupouqmqrpfjjhcubnun:50Projetil%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` | Conecta o servidor ao seu banco de dados no Supabase. |

---

## 🌐 2. VERCEL (Onde mora o seu Site/Frontend)
A Vercel exibe a parte visual do sistema para os usuários.

**Onde configurar:** No painel da Vercel > Seu Projeto > Settings > **Environment Variables**.

| Chave (Key) | Valor (Value) | Para que serve? |
| :--- | :--- | :--- |
| **`VITE_API_URL`** | `https://supabase-klo7.onrender.com` | Diz ao site onde ele deve buscar as senhas e fazer login (aponta para o Render). |
| **`VITE_SUPABASE_URL`** | `https://pupouqmqrpfjjhcubnun.supabase.co` | (Opcional) Usado se o site precisar falar direto com o Supabase. |
| **`VITE_SUPABASE_ANON_KEY`** | `(Sua chave Anon que está no Supabase)` | (Opcional) Chave de segurança para o site acessar o Supabase. |

---

## ⚡ 3. SUPABASE (Onde moram os seus Dados)
O Supabase fornece o banco de dados e as chaves.

**Onde encontrar as chaves:**
*   **DATABASE_URL:** Botão verde **Connect** > Aba **ORMs/Node.js** > Modo **Transaction**.
*   **URL e ANON KEY:** Settings (Engrenagem) > **API**.

---

## 📝 Resumo do Fluxo de Dados:
1.  O **Usuário** acessa o link da **Vercel**.
2.  A **Vercel** envia as ordens (chamar senha, fazer login) para o **Render**.
3.  O **Render** processa as ordens e salva tudo no **Supabase**.
4.  O **Supabase** guarda os dados e devolve para o Render, que devolve para a Vercel, que mostra para o Usuário.

---

### ✅ Status Atual:
*   **GitHub:** Atualizado com a versão final.
*   **Render:** Conectado ao Banco de Dados com IPv4/Pooling.
*   **Vercel:** Conectado ao Render.

**Seu sistema agora é multiusuário e acessível de qualquer lugar do mundo!**
