# Braingpt

Assistente executivo pessoal para WhatsApp, com backend independente e Evolution API como transporte. Nome oficial: **Braingpt**.

**Estado: primeira entrega implementada — transporte autenticado e testado. Ainda não é o agente completo nem está conectado ao WhatsApp de produção.**

Este repositório é o ponto central de código, especificações, instalação, testes e continuidade: https://github.com/ebarroso12/Braingpt.

## O que já está implementado

- Backend Node 24 e TypeScript, sem dependências de execução npm.
- `GET /health`, identificando explicitamente a fase `transport-only`.
- `POST /webhooks/evolution`, com segredo dedicado em header e limite de tamanho.
- Filtro de instância, allowlist por HMAC do telefone e limite por remetente.
- Ignora eventos técnicos/protocolo, mensagens próprias, grupos e mídia ainda não suportada.
- SQLite persistente, reserva atômica e prevenção de respostas duplicadas, inclusive entre processos e após reinício.
- Adapter de envio de texto pela Evolution v2, com timeout, sem redirects com credenciais e validação do identificador de saída.
- Tratamento de envios incertos sem reenvio cego ou falso sucesso.
- Logs sem corpo de mensagens, números, headers ou erros brutos do provedor.
- Testes HTTP com Evolution simulada, verificação de tipos e CI.
- Exemplos de configuração e implantação isolada em Docker, ainda sem execução Docker validada.

A resposta atual é fixa e informa que o modelo e as ferramentas ainda não estão conectados. Não há chamada à OpenAI nem execução de agenda, e-mail, tarefas ou finanças nesta fase.

## Início rápido

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
```

Para executar o servidor, siga [instalação e operação](docs/OPERACAO.md): configure uma instância de teste, uma `.env` privada e a allowlist; depois execute `npm start`. Nenhuma chave real é incluída. As variáveis vazias impedem a inicialização.

## Estrutura

```text
app/
  server.ts                inicialização e desligamento
  backend.ts               endpoints e processamento
  normalizer.ts            filtros dos eventos Evolution
  config.ts                validação da configuração
  security.ts              autenticação, HMAC e logs
  store.ts                 reservas e auditoria SQLite
  adapters/evolution.ts    envio de texto
migrations/                schema persistente
scripts/hash-phone.ts      geração local do HMAC da allowlist
tests/                     testes automatizados
docs/                      fontes, operação, plano e checkpoints
```

## O agente previsto

Agenda, e-mails, Drive/documentos, tarefas/lembretes, finanças, plantões, reescrita e encaminhamento a módulos separados de clínica e outros agentes. Alterações exigem confirmação humana; nenhuma operação pode ser declarada concluída sem retorno real; monitoramento sem novidade deve permanecer silencioso.

Essas capacidades estão [especificadas](docs/ESCOPO-DO-AGENTE.md), mas dependem das próximas fases: modelo, memória aprovada, ferramentas de leitura, confirmação estruturada e ferramentas de escrita. Consulte o [checkpoint atual](docs/STATUS.md).

## De onde veio o projeto

O proprietário recuperou a [especificação Evolution](docs/fontes/PROJETO-EVOLUTION.md) e o [handoff completo](docs/fontes/HANDOFF.md). Eles foram arquivados com endereços de infraestrutura removidos. A primeira tarefa recomendada por esses documentos foi implementada aqui sob o nome Braingpt.

Separadamente, um relatório identificou uma instalação anterior criada pelo Codex em `/srv/codex-whatsapp-workspace/kiro`, com ponte WhatsApp Codex e serviço `kiro-core.service`. Esse sistema pode enviar mensagens mesmo sem a versão Evolution existir. O código dessa instalação anterior **não foi importado ou reparado nesta entrega**. O mapa e a evidência histórica estão em [RECUPERACAO.md](docs/RECUPERACAO.md).

**O Kiro do OpenClaw é separado e não foi alterado.** Não houve leitura de credenciais, migração de sessões, reinício de serviços existentes ou envio real ao seu WhatsApp.

## Continuidade

Comece por [AGENTS.md](AGENTS.md) e [docs/STATUS.md](docs/STATUS.md). Cada entrega deve atualizar o estado real do projeto e os testes, sem confundir especificação com capacidade disponível.
