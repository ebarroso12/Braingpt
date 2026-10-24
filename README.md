# Braingpt

Assistente executivo pessoal para WhatsApp, com backend independente e Evolution API como transporte. Nome oficial: **Braingpt**.

**Estado: transporte e modo de agente implementados e testados com provedores simulados. Ainda não está conectado ao WhatsApp de produção nem possui todos os conectores.**

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
- Modo opcional OpenAI com chave existente no ambiente privado e ciclo limitado de ferramentas.
- Contexto cifrado e memória de preferências pessoais enumeradas, com confirmação humana, prazo de validade e consumo único.
- Exemplos de configuração e implantação isolada em Docker, ainda sem execução Docker validada.

Em `AGENT_MODE=transport`, a resposta é fixa e não chama modelo. Em `AGENT_MODE=openai`, o agente usa a chave existente e o modelo configurados no servidor. Os testes usam provedor simulado; não houve chamada real à conta OpenAI nesta entrega. Agenda, e-mail, tarefas, finanças e clínica ainda não estão conectados. Veja [modelo, memória e configuração](docs/MODELO-E-MEMORIA.md).

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

Essas capacidades estão [especificadas](docs/ESCOPO-DO-AGENTE.md). Modelo, contexto cifrado e confirmações de memória já têm implementação; conectores de leitura e escrita, novos escopos e teste real continuam pendentes. Consulte o [checkpoint atual](docs/STATUS.md).

## De onde veio o projeto

O proprietário recuperou a [especificação Evolution](docs/fontes/PROJETO-EVOLUTION.md) e o [handoff completo](docs/fontes/HANDOFF.md). Eles foram arquivados com endereços de infraestrutura removidos. A primeira tarefa recomendada por esses documentos foi implementada aqui sob o nome Braingpt.

Separadamente, um relatório identificou uma instalação anterior criada pelo Codex em `/srv/codex-whatsapp-workspace/kiro`, com ponte WhatsApp Codex e serviço `kiro-core.service`. Esse sistema pode enviar mensagens mesmo sem a versão Evolution existir. O código dessa instalação anterior **não foi importado ou reparado nesta entrega**. O mapa e a evidência histórica estão em [RECUPERACAO.md](docs/RECUPERACAO.md).

**O Kiro do OpenClaw é separado e não foi alterado.** Não houve leitura de credenciais, migração de sessões, reinício de serviços existentes ou envio real ao seu WhatsApp.

## Continuidade

Comece por [AGENTS.md](AGENTS.md) e [docs/STATUS.md](docs/STATUS.md). Cada entrega deve atualizar o estado real do projeto e os testes, sem confundir especificação com capacidade disponível.
