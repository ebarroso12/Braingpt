# Integração na ponte Codex existente

O proprietário esclareceu que usa a conversa consigo mesmo no WhatsApp e autorizou levar as atualizações ao sistema existente. Esse passa a ser o caminho principal; Evolution permanece opcional.

## Evidência e limite de acesso

Foi inspecionado o upstream público abuiles/codex-whatsapp-relay, commit e46f5dc00cf72b9b06afa57820d79d1148dbc368. Seu controller-bridge.mjs contém o mesmo menu recebido e aceita mensagens fromMe em conversa autorizada. Não foi obtida a cópia modificada de /opt ou o código antigo em /srv. Nenhum serviço remoto pode ser aplicado ou diagnosticado como corrigido a partir desta cópia pública.

## Implementação

1. Separar configurações do motor das credenciais Evolution. O modo relay não precisa de Evolution, QR novo nem outro cliente WhatsApp.
2. Decorar a instância existente WhatsAppControllerBridge: usar sua autorização, sessão e envio atuais. Aceitar pedidos fromMe somente na conversa consigo mesmo; excluir respostas do bot, protocolo e replays.
3. Encaminhar texto pessoal ao motor Braingpt e preservar comandos / e áudio nos fluxos nativos já existentes. Persistir reservas e IDs de saída; marcar todas as partes das respostas para impedir ecos antes da confirmação de ID.
4. Fornecer launcher que carrega a ponte já instalada, instala o adaptador antes de start e preserva sua verificação de proprietário. Não reescrever fontes nem copiar credenciais/sessões.
5. Testar por fixtures da interface inspecionada, com mensagens próprias, de terceiros, comandos, protocolo, eco de resposta, falha de envio e reinício. Documentar cutover com rollback e importação do código original quando o acesso estiver disponível.

Não chamar isso de atualização aplicada na VPS. Antes do cutover, comparar os arquivos modificados locais, verificar processos/filas e testar em cópia isolada. Não modificar OpenClaw. A coleta e a importação do código original completo continuam pendentes de acesso.
