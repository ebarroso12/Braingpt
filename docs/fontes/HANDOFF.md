> Fonte histórica fornecida pelo proprietário em 24/10/2026. O novo projeto se chama **Braingpt**. Endereço real de infraestrutura e domínio operacional foram removidos para publicação. Referências ao Kiro do OpenClaw são contexto histórico, não autorização para alterá-lo. As listas de capacidades e serviços descrevem relatos anteriores, não implementação ou estado atual verificados.

# KIRO — contexto completo para repassar a outra IA

Data deste handoff: 24/10/2026, fuso America/Sao_Paulo.

## 1. Resumo em uma frase

O KIRO é um assistente executivo pessoal originalmente executado dentro do OpenClaw em uma VPS, com WhatsApp e Telegram como canais, Google Workspace, dashboard financeiro, memória, automações e delegação para outros agentes; o projeto atual é reconstruir esse comportamento com a Evolution API como ponte do WhatsApp e um backend separado para o agente.

## 2. Estado real do projeto

### O que já foi feito

- O conteúdo do KIRO foi localizado e analisado a partir de inventários e arquivos fornecidos pelo usuário.
- Foram analisados `SOUL.md`, `AGENTS.md`, `USER.md`, `SKILL-KIRO.md`, memória, backups e uma saída extensa de inventário.
- Foram identificadas persona, regras de comportamento, integrações, cron jobs, diretórios, sessões, riscos e separação entre agentes.
- Foi criado um projeto de arquitetura para a versão via Evolution API.
- Foi criado um prompt de handoff para outra IA continuar o desenvolvimento.
- Foi criado um pacote sanitizado com persona, memória aprovada, capacidades/conectores e exemplos.

### O que ainda não foi feito

- Nenhum backend novo foi implementado.
- Nenhum webhook novo foi configurado.
- Nenhuma instância Evolution foi alterada.
- O KIRO ainda não foi conectado de fato à Evolution API nesta tarefa.
- Nenhuma chave, token ou arquivo OAuth foi copiado.
- Nenhum serviço foi reiniciado.
- Nenhum teste real de ponta a ponta foi concluído na nova arquitetura.

Portanto, existe uma especificação detalhada, mas a integração Evolution ainda é um projeto a implementar.

## 3. Origem do KIRO original

O sistema original está associado ao OpenClaw em uma VPS. O inventário fornecido registra:

- VPS: `root@[IP_PRIVADO_REMOVIDO]`.
- Sistema: Ubuntu com EasyPanel e Traefik.
- Gateway OpenClaw: porta 18789.
- Configuração principal: `/root/.openclaw/openclaw.json`.
- Workspace do KIRO: `/root/.openclaw/workspace-kiro`.
- Diretório do agente: `/root/.openclaw/agents/kiro`.
- Diretório operacional do agente: `/root/.openclaw/agents/kiro/agent`.
- Scripts: `/root/.openclaw/scripts/kiro-*.sh`.
- Variáveis de ambiente: `/root/.openclaw/.env`.

O `.env`, tokens, OAuth, arquivos de autenticação e chaves não fazem parte deste handoff.

## 4. Diretórios importantes

### Workspace do KIRO

```text
/root/.openclaw/workspace-kiro/
├─ IDENTITY.md
├─ SOUL.md
├─ AGENTS.md
├─ USER.md
├─ MEMORY.md
├─ SKILL-KIRO.md
├─ INTEGRATION-SPEC.md
├─ INTEGRATIONS-README.md
├─ PHASE-2-README.md
├─ PHASE-3-README.md
├─ PHASE-4-README.md
├─ APP_FUNCTIONS.md
├─ INJETAVEIS.md
├─ PENDENTE.md
├─ METRICS.md
├─ DREAMS.md
├─ memory/
├─ integrations/
├─ cron-jobs/
├─ cron-scripts/
├─ logs/
├─ backups e versões `.bak-*`
└─ workflows e arquivos n8n/Instagram
```

### Diretório do agente

```text
/root/.openclaw/agents/kiro/
├─ agent/
├─ sessions/
├─ session-sqlite-import-archive/
├─ workshop-skills/
├─ codex-home/
├─ .git/
├─ arquivos de conta/auth
├─ scripts duplicados ou históricos
└─ backups
```

Esse diretório contém material técnico e histórico demais para ser migrado integralmente. A árvore `.git`, plugins temporários, trajetórias e arquivos de autenticação não devem entrar no novo agente.

### Outros caminhos relacionados

```text
/root/.openclaw/agents/kiro-n8n
/root/.openclaw/workspace-kiro-n8n
/root/.openclaw/workspace-main
/root/.openclaw/scripts
/root/.openclaw/logs
/root/.openclaw/backups
/root/.openclaw/state.backup-*
```

O `kiro-n8n` é referência operacional de workflows de Instagram/n8n, não deve ser misturado automaticamente ao KIRO pessoal.

## 5. Arquivos de identidade e função

### `IDENTITY.md`

O arquivo-base estava praticamente vazio, com campos genéricos de identidade. A identidade real aparece em `SOUL.md` e na configuração do agente:

- Nome: Kiro.
- Emoji: 🤖.
- Função: assistente executivo pessoal do Dr. Edson.
- Frase de ativação registrada: `ativar kiro`.
- Resposta de ativação registrada: “Em que posso ajudar, Dr. Edson?”.

### `SOUL.md`

É o núcleo comportamental. Define KIRO como humano, objetivo, profissional, discreto, proativo e curto. Determina que ele não deve se apresentar como IA, chatbot, modelo de linguagem, Dashboard ou OpenClaw.

O arquivo também define regras de agenda, Gmail, Drive, leitura de documentos, boletos, recibos, encaminhamento de agentes, reescrita e segurança.

### `AGENTS.md`

É a política operacional do workspace:

- cron e heartbeat não devem enviar mensagens vazias;
- ausência de novidade = silêncio;
- falha simples fica em log;
- falha repetida por três ciclos gera alerta curto;
- DMs autorizadas devem receber resposta;
- memória deve ser tratada como continuidade, não como histórico bruto;
- não exfiltrar dados privados;
- não executar ações destrutivas sem autorização;
- Legendários e Injetáveis devem permanecer em fronteiras próprias.

### `USER.md`

Define o usuário principal, fuso horário, preferência por respostas curtas, necessidade de rascunhar e-mails, silêncio operacional, separação entre KIRO e dashboard e regras de plantões.

Esse arquivo contém dados pessoais e regras financeiras. Na migração, deve virar memória privada controlada, não prompt público.

### `SKILL-KIRO.md`

É a memória técnica do ecossistema. Contém infraestrutura, domínios, contas, agentes, endpoints, categorias financeiras, cron jobs, regras de canal e detalhes operacionais.

Não deve ser copiado inteiro para um prompt de GPT. Deve ser convertido em:

1. instruções comportamentais;
2. catálogo de capacidades;
3. conectores seguros;
4. runbooks administrativos separados.

## 6. Como o WhatsApp funciona no sistema original

No OpenClaw original, o gateway recebe mensagens por canais configurados e roteia por regras de agente. O inventário registra KIRO associado a WhatsApp e Telegram, com regras de roteamento para contas específicas.

O modelo conceitual é:

```text
WhatsApp/Telegram
        ↓
Gateway OpenClaw
        ↓ regras de binding/roteamento
Agente kiro
        ↓
SOUL + AGENTS + USER + MEMORY + skills
        ↓
Ferramentas e scripts
        ↓
Resposta pelo canal original
```

O número exato, os bindings e os tokens não devem ser tratados como prompt. Eles pertencem à configuração segura do canal.

## 7. Como o WhatsApp deverá funcionar com Evolution API

Na arquitetura nova, a Evolution API será a camada de transporte:

```text
WhatsApp
  ↓
Instância Evolution API
  ↓ webhook autenticado
Backend KIRO
  ├─ valida evento
  ├─ impede duplicidade
  ├─ identifica remetente
  ├─ carrega memória
  ├─ chama o modelo
  ├─ executa ferramentas autorizadas
  ├─ pede confirmação quando necessário
  └─ grava auditoria
  ↓ API de envio da Evolution
WhatsApp
```

### Entrada de mensagem

1. Usuário envia mensagem no WhatsApp.
2. A instância Evolution recebe a mensagem.
3. Evolution chama o webhook do backend.
4. Backend valida a origem e normaliza o evento.
5. O evento é associado a uma conversa.
6. O backend verifica se já processou aquele ID.
7. O sistema identifica o remetente e seu nível de autorização.
8. O KIRO recebe mensagem, contexto e memória mínima.
9. O agente responde diretamente ou chama uma ferramenta.
10. A resposta é enviada pela Evolution ao WhatsApp.

### Saída de mensagem

O backend deve chamar o endpoint de envio de texto da Evolution usando a instância correta. A chave da Evolution fica somente em variável de ambiente ou secret manager.

Nunca colocar a API Key no prompt, em arquivo Markdown ou em log.

### Estado atual da Evolution

O Manager informado pelo usuário é:

```text
https://evo.example/manager/
```

Em uma verificação anterior, a página abriu na tela de login e solicitou:

- Server URL: `https://evo.example`.
- API Key Global.

O painel autenticado não foi validado nesta tarefa. Portanto, ainda não foram confirmados o nome da instância, status do WhatsApp, webhook ou número conectado.

## 8. Capacidades do KIRO

### Agenda

- consultar eventos;
- criar, editar, cancelar e reagendar;
- verificar conflitos;
- registrar local, participantes e observações;
- criar lembretes;
- enviar resumos diários;
- lembrar compromissos próximos.

Toda alteração de agenda exige confirmação e confirmação posterior do resultado real.

### Gmail e e-mail

- consultar e-mails;
- identificar mensagens relevantes;
- resumir remetente, assunto e anexos;
- extrair datas e ações;
- preparar respostas;
- produzir textos de cobrança ou acompanhamento.

Regra crítica: o KIRO cria rascunho e só envia após aprovação.

### Drive e documentos

- buscar arquivos;
- resumir PDF, Word, Excel e apresentações;
- extrair valores, datas e vencimentos;
- organizar documentos;
- detectar compromissos que talvez precisem entrar na agenda.

### Tarefas e lembretes

- listar tarefas;
- criar tarefa;
- concluir tarefa;
- sincronizar Google Tasks;
- manter lembretes;
- detectar mudanças e conflitos.

O inventário registra uma integração de sincronização bidirecional e polling periódico. Isso precisa ser revalidado na implantação nova.

### Finanças

- interpretar boleto, recibo, nota e comprovante;
- identificar favorecido, valor, data e categoria;
- diferenciar despesa, receita e transferência;
- enviar registro ao dashboard;
- consultar contas a pagar;
- listar vencidas e próximas;
- manter regras de plantões e totais.

Regra: nunca registrar sem confirmação humana e nunca dizer “registrado” sem retorno positivo do sistema.

### Imagens, PDFs e áudio

- transcrever áudio antes de interpretar;
- analisar imagem ou PDF;
- extrair dados estruturados;
- pedir confirmação quando faltar certeza;
- enviar resultado para o conector correto.

### Reescrita

Tons conhecidos:

- formal;
- profissional;
- amigável;
- persuasivo;
- sério;
- cobrança;
- cobrança cordial;
- amigável persistente;
- curto;
- objetivo;
- elegante.

### Delegação

O KIRO deve manter fronteiras para:

- Serena;
- menu-router;
- Legendários/Agente 3 Colinas;
- Injetáveis;
- agentes médicos;
- CRM;
- financeiro;
- suporte técnico.

Delegar não significa copiar a memória ou responder assumindo a persona do outro agente.

## 9. Menu funcional registrado

O menu documentado tinha 13 áreas:

1. Agenda.
2. E-mails.
3. Financeiro pessoal.
4. Controle de gastos.
5. CRM — Leads e Vendas.
6. Documentos e arquivos.
7. Tarefas e lembretes.
8. Dashboard pessoal.
9. Área médica.
10. Injetáveis.
11. Briefing e planejamento do dia.
12. Suporte técnico/Bug Hunter.
13. Reescrever mensagem.

Na versão Evolution, esse menu pode ser acionado por linguagem natural. Não é necessário obrigar o usuário a digitar números.

## 10. Integrações registradas

### Google Workspace

Conta Google registrada no material: Gmail, Calendar, Drive e Contacts. A autenticação deve permanecer no servidor e nunca ser copiada para o novo prompt.

### Microsoft

Há referência a Microsoft 365 para Outlook Mail, OneDrive, Teams e To Do. Outlook Calendar não era o calendário padrão; só deveria ser usado se solicitado explicitamente.

### Dashboard

O KIRO tinha referências a endpoints de:

- comandos gerais;
- lançamento financeiro;
- ingestão de dados pessoais;
- chat IA roteado;
- contas a pagar;
- integração de clínica.

No novo sistema, esses endpoints devem virar ferramentas tipadas e protegidas, não chamadas livres de `curl` pelo modelo.

### Google Tasks

O inventário registra polling e sincronização bidirecional. A nova versão deve começar com leitura e só liberar escrita após confirmação e testes.

### Notion e Asana

Há templates de pollers e sincronização. Não tratar como ativos só porque os arquivos existem; o status precisa ser testado.

### n8n/Instagram

Existe workflow com Serena para Instagram, roteamento de respostas, memória de chat e marcador interno de encaminhamento para WhatsApp. É um fluxo separado e não deve ser misturado ao KIRO pessoal.

### Injetáveis

Existe uma aplicação clínica com consultas e ações reais. O acesso deve ter escopo restrito, autenticação própria e confirmação para alterações.

### Supabase clínico antigo

O material registra um projeto Supabase antigo como desativado. Não chamar esse backend sem confirmação atual; a documentação diz que o DNS não resolvia e que o fluxo deveria usar o endpoint atual de Injetáveis.

## 11. Automações registradas

O inventário registra scripts para:

- agenda da manhã;
- agenda da noite;
- notificações de Gmail;
- lembrete três horas antes;
- mensagens para esposa pela manhã, tarde e noite;
- sincronização de Tasks;
- revisão de memória;
- contexto inteligente;
- outbox;
- lembretes mensais de contas;
- tarefas relacionadas a Instagram/n8n.

Na arquitetura Evolution, cada automação deve ser reavaliada. Uma automação só envia mensagem se houver novidade real ou se a política de falha repetida exigir alerta.

## 12. Serviços ativos registrados

O inventário cita estes serviços systemd:

```text
openclaw.service
openclaw-ecosystem-hub.service
pre-consulta-webhook.service
```

Também registra o gateway OpenClaw em execução em uma verificação histórica, com serviço gerenciado externamente. Isso não prova que o estado continua igual em 24/10/2026.

### Importante sobre a nova arquitetura

Ainda não existe um serviço `kiro-evolution.service` documentado como criado. Para a nova versão, será necessário decidir entre:

- serviço Node/TypeScript no VPS;
- container Docker;
- serviço gerenciado em outra hospedagem;
- função web com banco externo.

Como a Evolution já está no ecossistema da VPS, a opção mais simples tende a ser um backend separado no mesmo ambiente, com serviço próprio, porta interna e HTTPS via proxy.

## 13. Inventário de arquivos e sessões

O inventário de 15/10/2026 registrou aproximadamente:

- 1.336 arquivos no workspace do KIRO;
- 7.349 entradas no diretório do agente;
- aproximadamente 246 itens de memória;
- milhares de JSONL de sessão e trajetória;
- backups de `SOUL.md`, `AGENTS.md`, `USER.md` e `SKILL-KIRO.md`;
- `.git` interno e árvore de plugins temporários.

### O que migrar

- persona;
- regras operacionais aprovadas;
- memória selecionada;
- exemplos anonimizados;
- catálogo de capacidades;
- regras de confirmação;
- fronteiras entre agentes.

### O que não migrar

- `.env`;
- OAuth;
- `.gauth.json`;
- `.accounts.json`;
- tokens;
- chaves;
- QR codes;
- bancos de sessão;
- histórico integral do WhatsApp;
- trajetórias;
- `.git`;
- plugins temporários;
- dumps de logs com dados pessoais.

## 14. Alertas de segurança identificados

O inventário continha diagnóstico indicando:

- campos com segredos em texto puro em configuração;
- gateway com bind de rede amplo, potencialmente acessível externamente;
- dispositivo pareado sem token de nó ativo;
- cron com três ou mais falhas consecutivas;
- vários crons com override de modelo;
- cinco crons isolados executando shell/processos;
- OAuth do n8n pendente;
- fluxos TaskFlow bloqueados apontando para tarefas ausentes.

Nada disso foi corrigido nesta tarefa. O novo agente deve começar isolado, com segredo fora do prompt e com auditoria antes de receber permissões de escrita.

## 15. Arquitetura recomendada do novo projeto

```text
kiro-evolution/
├─ app/
│  ├─ server.ts
│  ├─ routes/webhook.ts
│  ├─ routes/health.ts
│  ├─ adapters/evolution.ts
│  ├─ adapters/openai.ts
│  ├─ agent/instructions.ts
│  ├─ agent/orchestrator.ts
│  ├─ agent/policies.ts
│  ├─ memory/profile.ts
│  ├─ memory/retrieval.ts
│  ├─ tools/calendar.ts
│  ├─ tools/gmail.ts
│  ├─ tools/drive.ts
│  ├─ tools/tasks.ts
│  ├─ tools/finance.ts
│  └─ security/redaction.ts
├─ migrations/
├─ tests/
├─ .env.example
├─ README.md
└─ docker-compose.yml
```

### Endpoints internos mínimos

```text
GET  /health
POST /webhooks/evolution
GET  /admin/status       (protegido, opcional)
POST /admin/replay       (protegido, somente diagnóstico)
```

### Modelo de evento interno

```json
{
  "event_id": "id-external",
  "instance": "kiro",
  "conversation_id": "id-conversa",
  "sender_id": "id-remetente",
  "sender_phone": "normalizado internamente",
  "message_id": "id-mensagem",
  "message_type": "text|audio|image|document",
  "text": "mensagem",
  "received_at": "ISO-8601"
}
```

## 16. Banco mínimo

### `conversations`

Conversa, canal, instância, remetente, status e timestamps.

### `messages`

IDs externos, direção, tipo, texto sanitizado, status e timestamps.

### `memory_items`

Memória, escopo, origem, aprovação, validade e timestamps.

### `pending_confirmations`

Ação pendente, resumo, status, expiração e confirmação.

### `audit_events`

Ferramenta chamada, resultado, erro, identificador externo e timestamps, sem segredos.

## 17. Fluxo de confirmação

### Exemplo: criar evento

Usuário: “Marque uma reunião amanhã às 15h.”

1. KIRO identifica data, horário, duração e assunto.
2. Consulta conflitos.
3. Pergunta o que estiver faltando.
4. Apresenta prévia.
5. Usuário confirma.
6. Ferramenta cria evento.
7. Sistema verifica resposta real.
8. KIRO confirma nome, data, hora e lembretes.

### Exemplo: e-mail

1. KIRO lê e resume.
2. Prepara resposta.
3. Mostra rascunho.
4. Aguarda “pode enviar”.
5. Envia.
6. Confirma somente com retorno de envio.

### Exemplo: comprovante

1. KIRO interpreta imagem/PDF.
2. Extrai valor, data e descrição.
3. Mostra o que será registrado.
4. Pede confirmação.
5. Registra.
6. Verifica `ok` e identificador do registro.

## 18. Como outra IA deve continuar

Ela deve seguir esta ordem:

1. Ler este handoff.
2. Ler `KIRO-EVOLUTION-PROJETO.md`.
3. Ler `PROMPT-PARA-OUTRA-IA-KIRO-EVOLUTION.md`.
4. Não pedir ou exibir segredos.
5. Não alterar produção na primeira etapa.
6. Criar backend mínimo e `/health`.
7. Implementar webhook autenticado.
8. Implementar idempotência.
9. Implementar envio simples de texto.
10. Testar com uma instância controlada.
11. Só então adicionar memória e ferramentas de leitura.
12. Adicionar escrita mediante confirmação.

## 19. Primeira tarefa recomendada

“Crie um backend mínimo chamado `kiro-evolution` com endpoint `/health`, endpoint `/webhooks/evolution`, configuração por variáveis de ambiente, validação de webhook, idempotência por ID de mensagem e adapter de envio de texto pela Evolution API. Não implemente ainda agenda, Gmail, finanças, clínica ou envio automático de e-mail. Não use segredos reais. Mostre o plano, os arquivos criados, os testes e qualquer variável necessária.”

## 20. Critério de pronto

O novo projeto só pode ser considerado pronto quando:

- uma mensagem entra pela Evolution;
- chega uma única vez ao backend;
- o remetente é autorizado;
- o KIRO gera resposta curta;
- a resposta retorna ao WhatsApp;
- nenhum segredo aparece em prompt, código, log ou resposta;
- ações externas exigem confirmação;
- falhas reais são informadas sem falso sucesso;
- memória e escopos permanecem separados;
- existe teste automatizado e procedimento de desligamento.

## 21. Arquivos produzidos até aqui

No diretório de outputs da conversa anterior:

```text
KIRO-EVOLUTION-PROJETO.md
PROMPT-PARA-OUTRA-IA-KIRO-EVOLUTION.md
01-persona-instrucoes.md
02-memoria-aprovada.md
03-capacidades-e-conectores.md
04-exemplos-anonimizados.md
kiro-extracao-segura.md
```

Este arquivo é a consolidação geral para handoff.
