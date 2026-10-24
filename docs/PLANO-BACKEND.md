# Plano da primeira entrega — Braingpt

Objetivo: executar a primeira tarefa do handoff recebido, sem chaves reais e sem tocar no OpenClaw. Implementação nova, a partir da especificação; não é uma recuperação do código do servidor antigo.

Arquitetura: Node 24 e TypeScript executado nativamente, HTTP e SQLite nativos, sem dependências npm em execução. TypeScript e tipos Node são dependências de desenvolvimento para verificação estática. Evolution API v2 como transporte. Nesta fase, resposta de diagnóstico fixa e honesta; nenhuma chamada à OpenAI ou ferramenta de domínio.

## Limites

- Nome Braingpt; fuso America/Sao_Paulo.
- Instância exclusiva; webhook com segredo próprio em header; allowlist por HMAC do telefone.
- Nenhum dado de autenticação do OpenClaw, histórico bruto ou dado clínico migrado.
- Nenhuma mudança de produção ou envio real ao WhatsApp nesta entrega.
- A especificação e o handoff autorizam começar um backend novo. Isso complementa, não comprova a importação da implementação antiga descrita em RECUPERACAO.md.

## Tarefas e verificações

1. Configuração e normalização: app/config.ts, app/security.ts, app/normalizer.ts. Testar configurações inválidas e eventos sintéticos. Aceitar apenas messages.upsert de texto, de terceiros, da instância configurada e em conversa direta. Ignorar protocolo, mídia, grupos e mensagens próprias.
2. Persistência: migrations/001-inbox.sql e app/store.ts. Reserva atômica por mensagem/conversa/instância; limite por remetente; estados de envio e auditoria. Testar concorrência, duplicação após reinício e falha incerta. Nunca reenviar automaticamente uma mensagem cujo envio pode ter acontecido.
3. Transporte: app/adapters/evolution.ts e app/server.ts. GET /health, POST /webhooks/evolution autenticado, tamanho limitado, timeout e validação do retorno Evolution. Testar por HTTP real com Evolution simulada em localhost; proibir redirects com credenciais.
4. Operação: .env.example, Dockerfile, compose.yaml, instruções, checkpoint e CI. Publicar código revisado no repositório existente mantendo seus documentos. Não configurar uma instância real.

Cada tarefa usa teste que falha antes da implementação e suíte verde depois. Comando de verificação: npm test.

## Pontos de revisão

- Eventos de protocolo ou mensagens próprias não podem gerar loop.
- Duas instâncias do processo devem disputar uma única reserva SQLite.
- Timeout ou crash durante envio gera estado incerto, sem retry automático.
- Respostas HTTP 200 da Evolution sem identificador válido não provam envio.
- Logs não incluem corpo, headers, números ou mensagens de erro de terceiros.

## Conclusão desta fase

Backend de transporte testado, instalável e salvo no GitHub. A definição de pronto do agente completo exige etapas posteriores: modelo, memória aprovada, conectores, confirmações e teste real autorizado. Não marcar tais etapas como concluídas.
