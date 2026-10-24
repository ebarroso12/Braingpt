> Fonte histórica fornecida pelo proprietário em 24/10/2026. O novo projeto se chama **Braingpt**. Endereço real de infraestrutura e domínio operacional foram removidos para publicação. Referências ao Kiro do OpenClaw são contexto histórico, não autorização para alterá-lo. As listas de capacidades e serviços descrevem relatos anteriores, não implementação ou estado atual verificados.

# Projeto KIRO via Evolution API

## 1. Objetivo

Construir um assistente chamado KIRO, inspirado no agente OpenClaw já existente, conectado ao WhatsApp por uma instância da Evolution API.

O novo sistema deve preservar a personalidade, as preferências e as regras de segurança do KIRO, mas separar claramente:

- canal WhatsApp;
- motor de conversa;
- memória;
- ferramentas externas;
- confirmações humanas;
- integrações da clínica;
- logs e auditoria.

O sucesso não é apenas “responder no WhatsApp”. O sucesso é responder de modo consistente, executar ações somente com autorização, manter memória controlada e nunca expor credenciais ou declarar uma operação concluída sem confirmação real.

## 2. Princípio central

A Evolution API será somente a ponte de mensagens. Ela recebe mensagens do WhatsApp e entrega respostas. A inteligência do KIRO ficará em um backend separado.

```text
WhatsApp
   ↓
Evolution API
   ↓ webhook de entrada
Backend KIRO
   ├─ normalizador de mensagens
   ├─ memória
   ├─ orquestrador do agente
   ├─ ferramentas autorizadas
   ├─ confirmação humana
   └─ auditoria
   ↓ resposta
Evolution API
   ↓
WhatsApp
```

Não colocar a chave da Evolution, chave da OpenAI, tokens Google ou segredos de webhook dentro do prompt do agente.

## 3. Escopo da primeira versão

### Incluído

1. Receber texto do WhatsApp.
2. Identificar remetente e conversa.
3. Aplicar regras de acesso.
4. Carregar contexto e memória permitidos.
5. Gerar resposta com o modelo escolhido.
6. Enviar resposta pelo mesmo número usando Evolution API.
7. Registrar logs sem armazenar segredos.
8. Pedir confirmação antes de ações externas.
9. Evitar respostas duplicadas usando idempotência.
10. Permitir expansão posterior para áudio, documentos, agenda, Gmail, Drive e tarefas.

### Fora da primeira versão

- Importação integral do histórico do WhatsApp.
- Migração automática de sessões OpenClaw.
- Leitura de `.env`, OAuth, tokens ou bancos de autenticação.
- Envio automático de e-mail.
- Alterações financeiras sem confirmação.
- Operações clínicas sem conector e permissão próprios.
- Delegação automática para todos os agentes antigos.

## 4. Comportamento do KIRO

### Persona

Kiro é um assistente executivo pessoal do Dr. Edson: humano, objetivo, profissional, discreto, proativo e direto. Responde em português do Brasil e evita textos longos.

### Preferências

- Tratamento: Dr. Edson.
- Fuso: America/Sao_Paulo.
- Mensagens curtas e assertivas.
- Reescritas nos tons solicitados.
- Rascunho de e-mail antes do envio.
- Ausência de novidade em automações = silêncio.
- Falha simples de rotina = log interno; alerta somente conforme regra de repetição.

### Fronteiras

KIRO pessoal não é Serena, Injetáveis, menu-router, dashboard ou Legendários. Quando uma tarefa pertencer a outro domínio, o sistema deve encaminhar para o fluxo correto ou explicar que o conector não está habilitado.

## 5. Componentes do sistema

### 5.1 Evolution API

Responsável por:

- manter a conexão com WhatsApp;
- receber eventos;
- chamar o webhook do backend;
- enviar texto, mídia e eventualmente áudio;
- identificar a instância conectada.

O Manager serve para configurar a instância e o webhook. A API Key Global deve permanecer somente no ambiente seguro do servidor.

### 5.2 Backend KIRO

Responsável por:

- validar o webhook;
- normalizar mensagens;
- rejeitar eventos duplicados;
- aplicar allowlist de remetentes;
- chamar o modelo;
- executar ferramentas;
- controlar confirmações;
- mandar a resposta de volta à Evolution.

### 5.3 Modelo de IA

O modelo recebe apenas:

- instruções do KIRO;
- mensagem atual;
- memória necessária;
- resultados de ferramentas autorizadas;
- estado de confirmação, quando existir.

Ele nunca recebe chaves de API, conteúdo integral de `.env`, sessão bruta ou arquivos de autenticação.

### 5.4 Memória

Separar em quatro camadas:

1. **Perfil:** nome, fuso e preferências estáveis.
2. **Memória aprovada:** fatos que o usuário autorizou manter.
3. **Contexto curto:** últimas mensagens necessárias para a conversa.
4. **Auditoria:** eventos técnicos, sem depender do modelo para provar sucesso.

Memória não deve ser atualizada automaticamente por qualquer frase. Mudanças duráveis devem gerar proposta ou ser aceitas por uma regra explícita.

### 5.5 Ferramentas

As ferramentas devem ser funções tipadas, não comandos soltos escritos no prompt. Exemplos:

- `calendar_search`
- `calendar_create_draft`
- `calendar_update`
- `gmail_search`
- `gmail_create_draft`
- `drive_search`
- `tasks_list`
- `tasks_create_pending`
- `finance_extract`
- `finance_register_after_confirmation`
- `send_whatsapp_message`

Cada ferramenta deve declarar se é somente leitura, reversível ou exige confirmação.

## 6. Fluxo detalhado de uma mensagem

### Etapa 1 — Evolution recebe

O WhatsApp envia a mensagem para a instância conectada. A Evolution produz um evento de entrada.

### Etapa 2 — Webhook valida

O backend valida assinatura, segredo ou mecanismo equivalente configurado para o webhook. Se a validação falhar, registra o evento como rejeitado e não chama o modelo.

### Etapa 3 — Normalização

Converter o evento para um formato interno:

```json
{
  "event_id": "id-do-evento",
  "instance": "nome-da-instancia",
  "conversation_id": "id-da-conversa",
  "sender_id": "id-do-remetente",
  "sender_phone": "telefone-normalizado",
  "message_id": "id-da-mensagem",
  "message_type": "text|audio|image|document",
  "text": "conteúdo textual ou transcrito",
  "received_at": "data ISO com fuso"
}
```

### Etapa 4 — Idempotência

Consultar `message_id` ou `event_id`. Se já tiver sido processado, responder HTTP 200 sem gerar uma segunda resposta.

### Etapa 5 — Autorização

Classificar o remetente:

- Dr. Edson: acesso principal;
- contatos autorizados: acesso limitado conforme regra;
- clínica: escopo restrito;
- desconhecido: resposta mínima ou bloqueio, conforme política definida.

Nunca usar somente o nome exibido no WhatsApp como autorização.

### Etapa 6 — Contexto

Carregar perfil, memória aprovada e histórico curto da conversa. Aplicar limite de tamanho e remover campos sensíveis desnecessários.

### Etapa 7 — Decisão do agente

O KIRO classifica a intenção:

- conversa ou reescrita;
- consulta de informação;
- ação externa somente leitura;
- ação externa com confirmação;
- encaminhamento a outro fluxo;
- pedido fora do escopo.

### Etapa 8 — Confirmação, se necessário

Para uma ação sensível, o backend cria uma pendência estruturada:

```json
{
  "confirmation_id": "id",
  "conversation_id": "id",
  "action": "calendar_create|email_send|finance_register",
  "summary": "resumo legível",
  "expires_at": "data ISO",
  "status": "pending"
}
```

O usuário confirma com uma resposta clara. O sistema não deve interpretar qualquer mensagem vaga como autorização.

### Etapa 9 — Execução

Executar a ferramenta, guardar request/response sanitizados e verificar o resultado real.

### Etapa 10 — Resposta

Enviar texto curto pela Evolution. Se houver falha, informar falha real; nunca dizer “feito” sem prova.

## 7. Política de confirmação

### Pode ser automático

- Responder perguntas gerais.
- Reescrever texto.
- Consultar agenda, e-mail, arquivos ou tarefas.
- Procurar documento.
- Mostrar uma prévia.

### Exige confirmação

- Enviar e-mail.
- Criar, editar ou cancelar compromisso.
- Registrar despesa ou receita.
- Criar, concluir ou excluir tarefa.
- Enviar mensagem para terceiros.
- Alterar memória durável.
- Ações clínicas ou financeiras.

### Nunca fazer pelo modelo

- Revelar segredos.
- Exibir conteúdo de `.env`.
- Executar shell arbitrário.
- Alterar configuração da Evolution sem fluxo administrativo.
- Importar sessões privadas inteiras.

## 8. Banco de dados mínimo

Tabelas ou coleções recomendadas:

### `conversations`

`id`, `channel`, `instance`, `sender_id`, `sender_phone_hash`, `status`, `created_at`, `updated_at`.

### `messages`

`id`, `external_message_id`, `conversation_id`, `direction`, `type`, `text_redacted`, `status`, `created_at`.

### `memory_items`

`id`, `scope`, `content`, `source`, `approved`, `expires_at`, `created_at`, `updated_at`.

### `pending_confirmations`

`id`, `conversation_id`, `action`, `payload_redacted`, `status`, `expires_at`, `confirmed_at`.

### `audit_events`

`id`, `event_type`, `actor`, `result`, `external_id`, `error_code`, `created_at`.

## 9. Estrutura de projeto sugerida

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
│  ├─ webhook.test.ts
│  ├─ idempotency.test.ts
│  ├─ confirmation.test.ts
│  └─ policy.test.ts
├─ .env.example
├─ README.md
└─ docker-compose.yml
```

## 10. Variáveis de ambiente

Usar apenas placeholders no código/documentação:

```text
EVOLUTION_BASE_URL=https://evo.example
EVOLUTION_API_KEY=[armazenar no secret manager]
EVOLUTION_INSTANCE=[nome da instância]
EVOLUTION_WEBHOOK_SECRET=[armazenar no secret manager]
OPENAI_API_KEY=[armazenar no secret manager]
OPENAI_MODEL=[modelo escolhido]
DATABASE_URL=[armazenar no secret manager]
ALLOWED_PHONE_HASHES=[lista controlada]
TIMEZONE=America/Sao_Paulo
```

Não commitar `.env`, chaves, QR codes, arquivos OAuth ou dumps de sessão.

## 11. Configuração da Evolution

No Manager, a sequência conceitual é:

1. Confirmar a URL do servidor.
2. Confirmar ou criar uma instância exclusiva do KIRO.
3. Conectar o WhatsApp dessa instância.
4. Configurar o webhook apontando para `POST /webhooks/evolution`.
5. Selecionar somente eventos de mensagem necessários.
6. Configurar autenticação do webhook.
7. Testar mensagem recebida.
8. Testar resposta enviada.

Não reutilizar uma instância de produção sem confirmar o impacto. Para a primeira implantação, preferir instância de teste ou janela controlada.

## 12. Segurança

- Usar HTTPS.
- Validar autenticação do webhook.
- Aplicar rate limit por remetente.
- Redigir telefones e conteúdo sensível nos logs.
- Não registrar headers de autenticação.
- Separar leitura de escrita.
- Usar allowlist de remetentes.
- Expirar confirmações pendentes.
- Bloquear replay de evento.
- Manter backups antes de mudanças.
- Fazer rotação de qualquer segredo que tenha sido exposto.
- Não deixar o gateway administrativo aberto desnecessariamente na internet.

## 13. Testes obrigatórios

1. Mensagem simples recebe uma resposta.
2. Evento duplicado não gera duas respostas.
3. Remetente não autorizado não acessa dados pessoais.
4. Consulta de agenda não cria evento.
5. Criação de evento pede confirmação.
6. E-mail é apenas rascunhado até aprovação.
7. Registro financeiro pede confirmação.
8. Falha de ferramenta não gera falso sucesso.
9. Ausência de novidade em cron não gera mensagem.
10. Segredo nunca aparece na resposta ou no log.
11. Áudio é transcrito antes de ser interpretado.
12. Imagem de boleto gera resumo e confirmação.
13. Fluxo clínico não mistura memória pessoal.
14. Encaminhamento para outro agente conserva a fronteira de escopo.

## 14. Plano de implementação com checkpoints

- [ ] Definir nome da instância Evolution e número do WhatsApp. **CHECKPOINT**
- [ ] Criar backend mínimo com `/health`. **CHECKPOINT**
- [ ] Implementar webhook autenticado e idempotente. **CHECKPOINT**
- [ ] Implementar envio de texto pela Evolution. **CHECKPOINT**
- [ ] Inserir persona e políticas do KIRO sanitizadas. **CHECKPOINT**
- [ ] Adicionar memória de perfil e histórico curto. **CHECKPOINT**
- [ ] Adicionar confirmação estruturada. **CHECKPOINT**
- [ ] Adicionar ferramentas somente leitura. **CHECKPOINT**
- [ ] Adicionar ferramentas de escrita com confirmação. **CHECKPOINT**
- [ ] Adicionar áudio, imagem e documentos. **CHECKPOINT**
- [ ] Testar em número controlado. **CHECKPOINT**
- [ ] Ativar produção somente após aprovação final. **CHECKPOINT**

## 15. Definição de pronto

O projeto está pronto quando:

- uma mensagem real chega pela Evolution e recebe resposta;
- a resposta usa a persona correta;
- a duplicação de eventos está controlada;
- as ações externas têm confirmação;
- a memória está separada por escopo;
- nenhum segredo está no prompt, repositório ou log;
- os testes críticos passam;
- o usuário consegue desligar o agente sem perder dados;
- existe documentação suficiente para outra IA continuar o projeto.

## 16. Materiais de origem

Este projeto foi derivado dos arquivos de identidade, `SOUL.md`, `AGENTS.md`, `USER.md`, `SKILL-KIRO.md`, memória, inventário de 15/10/2026 e exemplos de sessão fornecidos pelo usuário. O histórico bruto não foi incorporado.
