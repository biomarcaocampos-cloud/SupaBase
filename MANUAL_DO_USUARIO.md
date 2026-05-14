# 📘 Manual do Sistema de Gestão de Atendimento e Agenda

Este documento descreve detalhadamente as funcionalidades, regras de negócio e permissões do sistema.

---

## 📑 Índice
1. [Visão Geral](#visão-geral)
2. [Perfis de Usuários e Permissões](#perfis-de-usuários-e-permissões)
3. [Emissão de Senhas (Kiosk)](#emissão-de-senhas-kiosk)
4. [Painel de Chamada (Display)](#painel-de-chamada-display)
5. [Mesa de Atendimento (Service Desk)](#mesa-de-atendimento-service-desk)
6. [Gestão de Agenda (Atermação)](#gestão-de-agenda-atermação)
7. [Administração e Estatísticas](#administração-e-estatísticas)
8. [Configurações e Tempos do Sistema](#configurações-e-tempos-do-sistema)

---

## 1. Visão Geral
O sistema é uma plataforma integrada para gestão de filas de espera, atendimento presencial e agendamentos de retorno. Ele opera em tempo real com sincronização via banco de dados em nuvem.

---

## 2. Perfis de Usuários e Permissões
O acesso às funcionalidades é restrito conforme o perfil do usuário logado:

| Perfil | Descrição | Permissões |
| :--- | :--- | :--- |
| **ADMIN** | Administrador Total | Acesso a todas as telas, gestão de usuários, edição de qualquer agendamento, visualização de estatísticas globais e configurações do sistema. |
| **GERENTE** | Gestor de Unidade | Acesso às telas de Agenda, Estatísticas e visualização do Painel de Chamada. Pode editar agendamentos mas não altera permissões de outros usuários. |
| **ATENDENTE** | Operador de Mesa | Acesso principal à Mesa de Atendimento e consulta de Agenda. Foco operacional na chamada e conclusão de senhas. |

---

## 3. Emissão de Senhas (Kiosk)
Localizado na entrada da unidade, permite que o cidadão retire sua senha.
- **Tipos de Senha:**
    - **NORMAL:** Atendimento padrão por ordem de chegada.
    - **PREFERENCIAL:** Prioridade legal (Idosos, Gestantes, PCD).
- **Funcionamento:** O sistema gera um código (ex: N001 ou P001) e registra o horário de entrada para cálculo de tempo de espera.

---

## 4. Painel de Chamada (Display)
Monitor posicionado na sala de espera.
- **Funcionalidades:**
    - Alerta sonoro a cada nova chamada.
    - Exibição em destaque da senha chamada e o número da mesa.
    - Histórico das últimas 5 senhas chamadas no rodapé.
    - Modo Tela Cheia disponível para melhor visibilidade.

---

## 5. Mesa de Atendimento (Service Desk)
Ferramenta de trabalho do Atendente.
- **Fluxo de Atendimento:**
    1. **Chamar Próximo:** O sistema seleciona automaticamente a próxima senha preferencial (se houver) ou normal.
    2. **Contador Regressivo (15s):** Ao chamar uma senha, inicia-se um cronômetro de 15 segundos.
    3. **Chamar Novamente:** Se o cidadão não comparecer, o botão fica disponível após os 15s. Pode ser clicado até 3 vezes.
    4. **Não Compareceu (Automático):** Após a 3ª tentativa sem sucesso, o sistema marca a senha como "Não Compareceu" e libera a mesa.
    5. **Finalizar Atendimento:** Abre formulário para registrar o serviço realizado e, opcionalmente, realizar um **Agendamento de Retorno**.

---

## 6. Gestão de Agenda (Atermação)
Módulo para marcar e gerir retornos programados.
- **Filtros Avançados:**
    - Busca por **Intervalo de Datas** (Data Inicial e Final).
    - Alternância entre Data de Registro e Data do Retorno.
    - Busca por Nome e CPF.
- **Categorias de Visualização:**
    - **No Período:** Registros dentro das datas selecionadas.
    - **Pendentes:** Todos os agendamentos futuros que ainda não foram atendidos.
    - **Cancelados:** Histórico de agendamentos desativados.
- **Paginação:** Listas com mais de 30 registros são divididas em páginas para performance.

---

## 7. Administração e Estatísticas
- **Painel de Usuários:** Cadastro, edição de perfis e alteração de fotos de usuários.
- **Dashboard Estatístico:**
    - Gráfico de volume de atendimentos por hora.
    - Médias de Tempo de Espera e Tempo de Atendimento.
    - Comparativo entre senhas Normais e Preferenciais.

---

## 8. Configurações e Tempos do Sistema
- **Tempo de Espera entre Chamadas:** 15 segundos.
- **Limite de Chamadas por Senha:** 3 tentativas.
- **Local do Retorno:** Opções fixas (JEC Central, Anexo FIG, Anexo ENIAC) com seus respectivos endereços integrados.
- **Sincronização:** O sistema verifica o banco de dados a cada 5 segundos para garantir que todas as telas estejam atualizadas.

---
*Documento gerado automaticamente pelo Sistema de Gestão de Senhas.*
