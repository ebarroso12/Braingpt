# Instalação e operação — fase de transporte

## O que esta entrega executa

Backend Node 24, sem dependências de execução npm, com HTTP, fetch e SQLite nativos. O TypeScript é executado pelo suporte nativo do Node; `npm run typecheck` usa TypeScript e tipos Node como dependências de desenvolvimento. Não há etapa de compilação.

No modo padrão `transport`, o backend só recebe texto e envia resposta fixa de validação. No modo `openai`, usa o modelo e o contexto/memória descritos em [MODELO-E-MEMORIA.md](MODELO-E-MEMORIA.md). Não executa shell, agenda, e-mail, finanças ou ações clínicas. Não é o assistente com todos os conectores pronto.

## Instalação local

1. Instale Node 24.13 ou posterior da série 24.
2. Clone este repositório e use a revisão validada. Execute `npm ci --ignore-scripts`, `npm run typecheck` e `npm test`.
3. Copie `.env.example` para `.env`, mantenha o arquivo privado (permissão 600) e preencha no servidor. Nunca envie esses valores no chat.
4. Configure uma instância Evolution v2 exclusiva para teste. Não altere uma instância já usada em produção.
5. Configure o segredo próprio do webhook e o salt do remetente com valores aleatórios distintos de pelo menos 32 caracteres. O segredo do webhook NÃO é a API key global da Evolution.
6. Execute `npm run hash-phone` no ambiente privado, informe o telefone com código do país e coloque o HMAC resultante em `ALLOWED_PHONE_HASHES`. É possível separar vários HMACs por vírgula. O salt usado pelo utilitário e pelo backend deve ser o mesmo.
7. Execute `npm start`. Consulte `GET /health` pelo endereço interno.

As variáveis vazias, URL inadequada, salt/segredo curtos ou allowlist inválida impedem a inicialização. `DATABASE_PATH` deve apontar para armazenamento persistente privado. Backup e proteção do disco continuam sendo responsabilidade da implantação.

## Evolution v2 e autenticação

Contrato de entrada suportado: `messages.upsert` ou `MESSAGES_UPSERT`, com `instance`, `data.key.id`, `data.key.remoteJid`, `data.key.fromMe: false` e texto em `data.message.conversation` ou `extendedTextMessage.text`. Consulte `tests/helpers.ts` para um exemplo sintético.

Exponha por HTTPS somente o caminho necessário: `POST /webhooks/evolution`, com corpo JSON. Configure a Evolution para enviar o header personalizado `X-Webhook-Secret` com o segredo dedicado. **A configuração concreta depende da versão instalada da Evolution:** confirme que suporta headers personalizados no webhook. Se não suportar, não remova a validação; configure um mecanismo autenticado equivalente antes da implantação. O projeto não reconhece qualquer assinatura HMAC da Evolution por suposição.

`EVOLUTION_BASE_URL` deve usar HTTPS. HTTP é permitido apenas para loopback em testes/desenvolvimento, não para um domínio externo. Não use chaves na query string. A saída chama `POST /message/sendText/{instance}` com header `apikey` e JSON `{ number, text }`. Redirects não são seguidos com credenciais.

O formato e a autenticação foram testados contra uma fixture local, não contra sua instância Evolution. É necessário validá-los com uma instância controlada antes de produção.

## Fluxo e limitações

- Autenticação antes da leitura do corpo; máximo de 64 KiB e JSON obrigatório.
- Filtro de instância e direção. Ignora grupos, status/broadcast, LIDs não resolvidos, protocolo, mídia e mensagens vazias.
- Autorização por HMAC do telefone no JID direto; não usa nome exibido.
- Reserva SQLite atômica antes do envio. A chave inclui instância, conversa e ID de mensagem. Não apagar a tabela de mensagens sem considerar que reentregas antigas poderão ser processadas novamente.
- Limite por remetente autorizado, persistente, de 20 novas mensagens por minuto por padrão. O proxy de produção deve adicionar limite global e de conexões, sobretudo para requisições não autorizadas.
- O webhook aguarda o envio até o timeout configurado (padrão 10 s). Ajuste o timeout do emissor/proxy para ser maior; reentregas são deduplicadas. Não há fila assíncrona com recuperação de jobs nesta fase.
- `/health` prova apenas que o processo responde. Não verifica a conexão do WhatsApp ou da Evolution e retorna explicitamente `modelConnected: false`.
- Não há permissão de escrita externa de domínio nem conectores de terceiros. Só a resposta direta ao remetente autorizado é enviada. Não há reenvio automático, comandos administrativos, endpoint de replay ou acesso ao OpenClaw.

## Persistência e estados

As tabelas de transporte guardam referências HMAC, estados e timestamps. No modo de agente, histórico curto, preferências aprovadas e propostas são guardados cifrados em tabelas separadas; veja MODELO-E-MEMORIA.md. A auditoria não armazena corpo ou headers. O número do remetente só é usado em memória durante o envio.

Estados: `processing` (reserva), `sending` (chamada iniciada), `accepted` (Evolution retornou identificador válido para o destinatário esperado), `uncertain` (falha/timeout/retorno sem evidência suficiente). **Accepted não significa entregue ou lido no WhatsApp.**

Uma entrega com erro retorna HTTP 200 e `delivery_unconfirmed` ao webhook para evitar retries cegos. O erro fica na auditoria; não há uma segunda mensagem de falha pelo mesmo canal. Duplicatas também retornam 200 sem novo envio. Rate limit retorna 429 com Retry-After.

Se o processo cair entre a reserva e a gravação final, a mensagem pode ficar em `processing` ou `sending`. Ela continua reservada e não é reenviada no reinício. Isso prioriza evitar duplicação; pode perder uma resposta. Investigue o ID correspondente na Evolution antes de qualquer intervenção. Não prometa exatamente uma entrega em sistemas distribuídos: o que existe é reserva única e ausência de retry automático.

## Docker (opcional)

`docker compose up --build -d` usa serviço próprio `braingpt`, volume nomeado persistente e porta publicada somente em 127.0.0.1. O exemplo não modifica Traefik, EasyPanel, serviços ou instâncias existentes. Configure separadamente o proxy HTTPS e limites de requisição.

O Dockerfile e compose são fornecidos como configuração de implantação; a execução em Docker deve ser validada no host de destino. Não os trate como prova de implantação concluída.

## Desligamento, backup e retorno

- Node: envie SIGTERM ao processo; ele para de aceitar conexões e aguarda as requisições em andamento. O prazo inclui os timeouts configurados de modelo e Evolution, mais 15 segundos.
- Docker: `docker compose stop`. Para retornar, `docker compose start` com a mesma configuração e volume.
- Não use `docker compose down -v`: isso remove o estado persistente.
- Faça backup com o processo parado e copie o diretório de dados completo, incluindo arquivos SQLite auxiliares. Guarde o backup em armazenamento privado.
- Para rollback, retorne à revisão anterior do código sem apagar dados. O processo recusa versões de schema futuras desconhecidas.
- Não apague ou troque o salt sem planejar o impacto na allowlist e na deduplicação.

## Próximas fases

Validar o modelo escolhido e a instância Evolution reais; implementar ferramentas somente leitura e depois escrita com confirmação estruturada. Modelo, contexto cifrado e confirmações de preferências já foram implementados com testes simulados. Adicionar áudio/documentos com transcrição/extração antes da interpretação. Preservar escopos independentes para pessoal, clínica e delegação. Ver ESCOPO-DO-AGENTE.md e fontes/PROJETO-EVOLUTION.md.
