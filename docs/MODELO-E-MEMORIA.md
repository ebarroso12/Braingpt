# Modelo, contexto e memória do Braingpt

## Escolha de credenciais

O motor também pode ser usado diretamente pela ponte Codex existente, sem Evolution; veja [APLICAR-NA-PONTE-EXISTENTE.md](APLICAR-NA-PONTE-EXISTENTE.md). As variáveis AGENT_MODE e EVOLUTION_* descritas para o backend HTTP não são exigidas pelo launcher da ponte.

O proprietário escolheu **usar uma chave OpenAI existente**. Esta entrega não cria chave, não lê credenciais do OpenClaw e não copia valores de outro serviço. O processo lê a chave da variável privada `OPENAI_API_KEY` na implantação. Nenhuma chave real estava disponível neste ambiente, portanto não houve chamada real à OpenAI.

## Ativação do modo de agente

O modo padrão continua `AGENT_MODE=transport`, para validar o canal sem chamadas pagas. Para o modo de conversação, configure no ambiente privado:

- `AGENT_MODE=openai`.
- `OPENAI_API_KEY`: a chave existente, por secret manager/ambiente do serviço.
- `OPENAI_MODEL`: identificador explícito do modelo ao qual essa chave tem acesso. Não há modelo inventado como fallback.
- `STATE_ENCRYPTION_KEY`: 32 bytes aleatórios codificados em base64, distintos da chave OpenAI, do segredo do webhook e do salt.
- `OPENAI_TIMEOUT_MS`: prazo total do ciclo do modelo, padrão 20000, máximo 30000 ms.

Não cole chaves no WhatsApp ou no repositório. Guarde a chave de cifra junto ao backup privado: trocar a chave sem migrar os dados impede a leitura da memória antiga. O código falha de forma explícita/sanitizada em vez de fingir que a memória está vazia.

O backend usa a [Responses API](https://developers.openai.com/api/docs/guides/function-calling) com funções de schema estrito, `store:false`, limite de saída, timeout e no máximo quatro etapas de modelo. O raciocínio cifrado retornado pelo provedor é reenviado somente dentro do ciclo corrente quando necessário; não fica no histórico local. Não há sandbox, shell ou acesso irrestrito a arquivos.

O endereço da API é fixo em `https://api.openai.com/v1/responses`; chaves são enviadas somente pelo header de autenticação, não como instrução, memória ou argumento de ferramenta. Redirects não são seguidos.

`/health` informa se o modo de agente foi configurado. Não realiza uma chamada ao provedor a cada consulta; o campo `modelConnected:false` não é uma verificação de conectividade. Um teste real ainda precisa validar o modelo e a conta escolhidos.

## Capacidades habilitadas nesta entrega

- Conversação e reescrita pelo modelo configurado.
- Perfil/instruções do Braingpt, fuso configurado e data atual.
- Contexto curto cifrado: até 12 mensagens por conversa, com até 4000 caracteres cada e expiração de 24 horas. O modelo recebe as últimas seis mensagens, além da atual.
- Listagem de preferências pessoais já aprovadas.
- Proposta de memória durável **somente para preferências enumeradas**: período de reuniões, tamanho das respostas e tom. Não há campo de fato livre disponível ao modelo.
- Proposta de esquecimento de preferência por identificador.
- Catálogo de capacidades que declara os conectores ainda indisponíveis.

As preferências são convertidas pelo backend para frases canônicas. O modelo não consegue usar esse caminho para guardar diagnósticos, prontuários ou credenciais como um “fato pessoal”. Outros tipos de memória precisam de esquema e política próprios numa entrega posterior.

## Confirmação humana

O modelo somente propõe. O backend gera um resumo e código aleatório, com prazo de 10 minutos. O usuário responde `Confirmo <código>` ou `Cancelar <código>` na mesma conversa. “Sim” sozinho não executa uma alteração. O código não é uma senha: serve para vincular a decisão a uma proposta exata.

A confirmação é consumida numa transação SQLite. Ela verifica a conversa, o status e o prazo **depois** de adquirir o bloqueio do banco. Reentregas e confirmações repetidas não executam novamente. Não existe ferramenta que permita ao modelo aprovar a própria proposta.

Ao confirmar esquecimento, o backend remove a preferência e limpa o contexto curto daquela conversa, para que o fato não continue sendo reenviado pelo histórico. A operação limpa o estado ativo; não apaga backups privados anteriores.

## Separação e cifra

O escopo é um HMAC de instância e conversa. Uma conversa não pode confirmar ou ler a memória de outra. O conteúdo de histórico, memória e propostas é cifrado com AES-256-GCM, com o escopo autenticado como AAD. Logs e auditoria guardam códigos e referências, não texto ou credenciais.

O domínio atual é pessoal. Não há ferramenta clínica ou memória clínica; o OpenClaw e seus agentes permanecem fora do acesso do backend. Ativar clínica depois exige conector, escopo e permissões separados.

## Conectores ainda não habilitados

Calendar, Gmail, Drive, Tasks, finanças, clínica, envio a terceiros e delegação não estão conectados. Pedidos a funções desconhecidas retornam indisponibilidade; não existe executor de comandos arbitrários. A confirmação implementada nesta fase aplica-se à memória; ela não habilita ações financeiras ou clínicas.

As instruções proíbem declarar sucesso sem evidência e a implementação gera as respostas de confirmação de memória sem depender do modelo. Respostas livres do modelo continuam precisando de avaliação antes de liberar ações externas reais.

## Falhas e implantação

Erro de modelo retorna resposta curta e sanitizada ao solicitante. Não imprime mensagens brutas do provedor. Falhas de envio continuam sem retry cego, conforme OPERACAO.md.

A migração 002 preserva reservas e auditoria da entrega anterior, adicionando tabelas cifradas. A migração 003 adiciona referências de saída da ponte; schema atual: versão 3. Para rollback ao código que só conhece versões anteriores, restaure backup compatível: não reduza `user_version` manualmente.

O prazo do emissor/proxy deve comportar a soma dos timeouts de modelo e Evolution, mais margem. O desligamento espera o ciclo em andamento dentro de prazo; compose usa 65 segundos de tolerância. Isso ainda não é uma fila assíncrona de jobs com recuperação automática.

Esta entrega foi testada com OpenAI e Evolution simulados. O acesso à VPS, a chave existente e as credenciais da Evolution não estavam disponíveis aqui. Nenhuma instância, webhook real ou serviço de produção foi modificado.
