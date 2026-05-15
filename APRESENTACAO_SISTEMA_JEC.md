# Guia Definitivo e Roteiro Completo: Sistema de Gestão de Senhas JEC Guarulhos

## 1. O Problema e a Solução
O Juizado Especial Cível (JEC) atende a um volume enorme de cidadãos diariamente. Historicamente, a gestão desse fluxo dependia de listas de papel, chamadas verbais difíceis de ouvir e nenhuma previsibilidade para quem aguardava. Além disso, a coordenação não tinha como medir o tempo médio de atendimento de cada servidor ou o tempo que o cidadão esperava na fila.

O **Sistema de Gestão de Senhas JEC Guarulhos** nasceu para digitalizar 100% dessa jornada. Ele não é apenas um "distribuidor de senhas", é um ecossistema completo que orquestra o fluxo desde a entrada do jurisdicionado até a saída dele, fornecendo dados em tempo real para a gestão do tribunal.

---

## 2. A Arquitetura Tecnológica
O sistema foi construído como uma aplicação web moderna (Single Page Application - SPA), permitindo que seja acessado de qualquer navegador sem necessidade de instalar aplicativos.
*   **Interface (Frontend):** React.js + Vite + Tailwind CSS. A interface usa um "Dark Mode" elegante de alto contraste, com fontes legíveis (monoespaçadas para números), otimizado tanto para totens touch-screen quanto para TVs de tela grande.
*   **Servidor (Backend):** Node.js com Express. Ele recebe as ações dos atendentes e distribui instantaneamente para as telas.
*   **Armazenamento (Database):** Supabase (um backend-as-a-service baseado em PostgreSQL). Garante persistência e segurança de dados em nuvem.
*   **Hospedagem:** Vercel (Frontend) e Render/Railway (Backend).

---

## 3. Exploração Detalhada dos Módulos (Telas)

### 3.1. Totem de Autoatendimento (TicketDispenser)
Esta é a porta de entrada. Um tablet ou monitor touch-screen posicionado na recepção. O foco aqui é **Acessibilidade e Rapidez**.

**A interface:** Botões gigantes, cores que indicam ação. Não há menus complexos.
**Os 5 Serviços Configurados:**
1.  Triagem de Petições (cor padrão)
2.  Atermação Inicial
3.  Atermação Criminal
4.  Informações / Outros
5.  **Atermação Retorno Agendado** (A joia da coroa tecnológica do sistema)

**A "Trava de Segurança" da Atermação Agendada:**
Diferente dos outros botões que cospem uma senha imediatamente, a Atermação de Retorno exige validação rigorosa para evitar fraudes ou cidadãos vindo no dia errado. O fluxo funciona assim:
*   O cidadão toca na opção. Um teclado virtual aparece pedindo o **CPF** ou **Nome**.
*   O sistema consulta o banco de dados em tempo real.
*   **Validação 1:** Se não achar, exibe "Cadastro não encontrado".
*   **Validação 2 (A Trava de Data):** Se o cidadão está agendado para a semana que vem, o sistema avisa: "Agendamento localizado para o dia [X], não é possível emitir a senha hoje".
*   **Validação 3 (Proteção Contra Duplicidade):** Se o cidadão já tirou a senha hoje e tentar de novo, o sistema avisa que o status dele já consta como utilizado.
*   **Sucesso:** Se bater exatamente com a data de hoje, o sistema libera a senha, imprime o ticket na impressora térmica e, **imediatamente**, vai no banco de dados, marca o status daquele cidadão como `COMPARECEU` e crava o horário exato (`compareceu_data`). Isso avisa a coordenação de que a pessoa chegou.

**Lógica de Senhas:** O cidadão sempre responde se é atendimento **Normal** ou **Preferencial**. Senhas normais começam com "N" (ex: N045). Preferenciais com "P" (ex: P012). O sistema zera a contagem toda noite automaticamente.

---

### 3.2. Painel de Chamada em TV (DisplayScreen)
Fica na sala de espera. Desenhado para chamar a atenção visualmente e sonoramente.

*   **Destaque Central:** Quando o atendente clica em chamar, a tela pisca levemente, soa um alerta de "BEEP" alto, e o centro da tela exibe em letras garrafais amarelas: **"SENHA N022 - MESA 05 - JOÃO"**.
*   **Histórico (Lado Direito):** Exibe as últimas 4 senhas chamadas. Essencial para quem foi ao banheiro ou se distraiu.
*   **Letreiro Digital Informativo (Rodapé):** Uma barra com texto em movimento contínuo (Marquee). Mostra dicas configuradas pela gestão, como "Tenha em mãos o documento com foto". O letreiro se sobrepõe com uma "Mensagem de Alerta" piscante vermelha caso haja uma emergência ou aviso crítico.

---

### 3.3. Mesa do Atendente (ServiceDesk)
A tela usada pelos servidores na área interna. O foco é **Controle de Fluxo**.

**Autenticação:** O servidor faz login com usuário e senha encriptada. 
**Preparação da Mesa:** Ele diz ao sistema: "Eu sou o João, estou na mesa 3, e hoje só vou atender Triagem e Informações". O sistema cria uma fila exclusiva e filtrada só para ele.

**A Régua de Atendimento (Workflow):**
1.  **Chamar Próximo (Prioridade Inteligente):** O sistema varre as filas. Se tiver um "Preferencial" esperando pelo serviço que o João atende, ele puxa o Preferencial. Se não, puxa o Normal. A senha vai para a TV.
2.  **Cronômetro de Espera (Auto-Recall):** Assim que chama, um cronômetro de 15 segundos começa a rodar na tela do João. Se o tempo zerar e a pessoa não aparecer na mesa, o botão "Rechamar" brilha. 
3.  **Abandono Automático:** O sistema limita a 3 rechamadas. Se na terceira tentativa o cidadão não aparecer, o sistema marca a senha como **"Não Compareceu"**, remove da tela e limpa a mesa para a próxima.
4.  **Atendimento Real:** Se a pessoa senta na mesa, o João clica em "Iniciar Atendimento". O sistema começa a cronometrar o **Tempo de Serviço**. 
5.  **Finalização:** Ao concluir, clica em "Finalizar". O sistema pega o Tempo de Espera + Tempo de Serviço, empacota num relatório e salva no banco histórico.

---

### 3.4. Dashboard da Coordenação (Painel de Gestão)
A torre de controle do JEC. Onde a magia dos dados acontece. Esta tela tem várias abas e funcionalidades profundas.

**1. Visão Geral (Métricas em Tempo Real):**
Seis "Cards" vitais no topo da tela:
*   Preferenciais Aguardando e Normais Aguardando.
*   Senhas Abandonadas (Não Compareceu) e Realizados.
*   Mesas em Atendimento Ativas.
*   **Estimativa de Tempo Restante:** O sistema soma quantas pessoas faltam ser atendidas. Pega a "velocidade média" de atendimento do dia. Divide pela quantidade de mesas trabalhando agora e diz: "Faltam 2 horas e 15 minutos para zerar o salão". 

**2. Relatórios Avançados:**
*   **Atendimentos por Serviço:** Qual serviço é mais gargalo? A Triagem demora 5 minutos, mas a Atermação demora 45? O sistema calcula a média exata de tempo de espera e serviço de cada tipo.
*   **Produtividade por Atendente (Ranking):** Mostra quem atendeu mais senhas no dia e a média de tempo de cada um. Ajuda a identificar servidores ociosos ou sobrecarregados.

**3. Gerenciamento de Mesas Remoto:**
A coordenação tem um modal mágico. Ela clica num botão e vê exatamente qual servidor está logado em qual mesa. Se um servidor esqueceu a mesa logada e foi embora, a coordenação consegue "Derrubar" a conexão dele ou forçar a mesa a aceitar outros tipos de serviço para desafogar o salão.

**4. Gestor de Agendamentos (A Agenda):**
É aqui que a coordenação insere os cidadãos que vão voltar no futuro.
*   **Filtros:** Busca instantânea por Data, Nome ou CPF.
*   **Inteligência Visual:** O Status muda de cor sozinho. 
    *   Amarelo: AGENDADO
    *   Vermelho: CANCELADO
    *   Azul (COMPARECEU): Ao passar o mouse por cima do azul, o gerente vê um tooltip invisível dizendo "Compareceu às 14h22". 
*   **Proteção de Dados:** Se a pessoa já compareceu (status azul), o botão de edição (lápis) fica bloqueado (cinza). Ninguém consegue adulterar um agendamento já utilizado.

**5. Controle de Letreiro (Marketing Institucional):**
Uma interface simples onde a gestão escreve 10 frases que vão ficar rolando na TV da sala de espera. Se acabar a luz ou houver greve, há um campo chamado "Alerta Crítico" que substitui tudo por uma faixa amarela piscante na TV.

---

## Conclusão para Apresentação
O Sistema do JEC Guarulhos representa a virada digital do tribunal. Ele tira a pressão dos ombros dos servidores automatizando as regras, protege os dados contra agendamentos fantasmas com travas de segurança e, principalmente, traz dignidade e previsibilidade ao cidadão que busca o poder judiciário. É tecnologia pública feita com excelência corporativa.
