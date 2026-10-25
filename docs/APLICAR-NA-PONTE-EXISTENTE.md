# Aplicar Braingpt na ponte WhatsApp Codex existente

## Pedido vigente

O proprietário quer usar a instalação que já responde quando escreve para si mesmo. Ele autorizou levar o nome Braingpt e as atualizações a essa instalação. **Não migrar o canal para Evolution, não pedir QR novo e não alterar o Kiro do OpenClaw.**

O código deste repositório agora inclui um adaptador e launcher para a ponte existente. Isso não é uma aplicação remota: o ambiente de desenvolvimento não possui o diretório /opt da VPS, o código /srv antigo, conexão SSH ou credenciais do serviço. A aplicação deve ocorrer na máquina que já executa a ponte.

## Como o adaptador funciona

`app/relay/launch.ts` carrega os módulos da ponte já instalada e decora sua instância antes do start. Usa a sessão WhatsApp, a allowlist e o socket existentes. Não cria cliente Baileys, instância Evolution, autenticação ou QR próprios. Não reescreve os arquivos da ponte.

O contrato foi inspecionado no upstream público [abuiles/codex-whatsapp-relay](https://github.com/abuiles/codex-whatsapp-relay/tree/e46f5dc00cf72b9b06afa57820d79d1148dbc368), em controller-bridge.mjs e controller-daemon.mjs. A versão modificada instalada na VPS ainda precisa ser comparada. Fixtures exercitam esse contrato, mas não equivalem a executar o código privado instalado.

- Texto pessoal autorizado vai para o motor Braingpt atualizado.
- Comandos iniciados por `/` e áudio de entrada continuam delegados ao fluxo nativo. Seu processamento original, ferramentas, limites e falhas não são substituídos pelo novo motor.
- Mensagens `fromMe` só entram como pedidos quando correspondem à conversa consigo mesmo, verificada contra a conta conectada e a configuração autorizada.
- Protocolo, grupos, remetentes desconhecidos e replays antigos são ignorados.
- IDs de saída são reservados antes do envio e persistidos para bloquear ecos, inclusive áudio antes do ACK.
- Todas as partes de texto usam o marcador `[Braingpt]`, que também bloqueia ecos anteriores ao ACK. Esse marcador não é usado como autorização.
- O envio usa o parâmetro `messageId` suportado pelo Baileys rc.9 inspecionado. Se a versão instalada não respeitar esse contrato, o envio é considerado incerto; validar antes do cutover.
- Timeout não provoca reenvio cego. Um envio já iniciado pode se concluir depois do timeout; nenhuma parte seguinte deve ser enviada nesse caso.
- No desligamento, lotes já aceitos são drenados antes de fechar o adaptador. Faça manutenção sem novos pedidos: mensagens novas durante a parada não possuem garantia de entrega/recuperação.

O motor novo permite conversa, reescrita, contexto cifrado e preferências com confirmação. Não possui todos os conectores e executores do Kiro antigo. O erro de autenticação/execução do Claude antigo ainda precisa de investigação no código instalado; não foi diagnosticado como corrigido.

## Etapa 1 — inspecionar na máquina conectada

Leia AGENTS.md e confirme o estado real, sem expor credenciais:

1. Identifique qual processo e unidade possuem a sessão que responde ao usuário. O relatório antigo citou duas cópias em /opt; não presuma que ambas devam rodar para a mesma conta.
2. Inspecione os arquivos controller-daemon.mjs, controller-bridge.mjs e os pontos de importação/roteamento do Kiro antigo. Compare a interface com a referência pública. Não aplique substituição global de nomes.
3. Identifique tarefas ativas, filas e respostas pendentes. Não interrompa a própria execução antes de salvar seu resultado e o ponto de retomada.
4. Faça backup privado de código/configuração necessários e registre a unidade/ExecStart atuais para rollback. Não publique sessões, bancos operacionais, credenciais ou env reais.
5. Importe o código original útil de /srv/codex-whatsapp-workspace/kiro e suas alterações para uma área identificada do repositório, após revisão de dados privados. Não copie /root/.openclaw. Até essa importação ocorrer, não declarar que todo o código antigo está no GitHub.

## Etapa 2 — preparar instalação isolada

1. Use uma cópia deste repositório, mantendo a ponte existente no lugar. Node 24.13+ da série 24 é necessário; confirmar o binário real antes de trocar ExecStart.
2. Execute `npm ci --ignore-scripts`, `npm run typecheck` e `npm test`.
3. Configure o ambiente privado com base em `deploy/relay.env.example`. A chave OpenAI será a **existente**, por ambiente/secret manager. Nenhuma chave deve aparecer no chat ou nos logs.
4. `RELAY_ROOT` aponta para a ponte instalada; `DATABASE_PATH` deve ser absoluto, privado e persistente. Salt, chave de cifra e namespace devem ser estáveis entre reinícios.
5. Não usar as credenciais Evolution neste modo. A autorização continua vindo de configStore da ponte.
6. Testar primeiro numa cópia isolada com runtime/provedor simulados. Não iniciar uma segunda ponte sobre a mesma sessão real para “testar”: isso pode interferir na conexão ou no estado do controlador.

## Etapa 3 — cutover controlado

O arquivo `deploy/codex-whatsapp-relay.override.example` é apenas um modelo. Não foi instalado e seus caminhos devem ser confirmados. Preservar User, WorkingDirectory, diretórios de auth e demais opções da unidade atual.

Com a fila drenada e o resultado da execução salvo, substituir somente o ponto de entrada da unidade Codex que já possui a sessão, para carregar `app/relay/launch.ts` com o ambiente privado. Não iniciar outro controlador ou reiniciar OpenClaw.

Validar, no número do próprio usuário e na janela autorizada:

1. Texto na conversa consigo mesmo recebe uma única resposta com identidade Braingpt.
2. Evento técnico não gera resposta; resposta do bot não vira novo pedido.
3. Reentrega não duplica resposta, inclusive após reinício.
4. `/project`, `/status`, aprovações nativas e áudio continuam no fluxo existente.
5. O pedido de salvar preferência pede confirmação, não grava antes e não aceita código de outra conversa.
6. Verificar a chamada ao modelo real e o resultado de envio sem expor os respectivos segredos.

Se falhar a compatibilidade, parar apenas a unidade Codex alterada e restaurar o ponto de entrada anterior. Não apagar auth, sessões ou volume. A migração atual de banco é versão 3; rollback de banco exige backup compatível, não alterar user_version à força.

## Registro obrigatório após aplicação

Salvar no GitHub o commit efetivamente aplicado, o código original recuperado e revisado, os testes reais, a unidade alterada, o estado da fila e o procedimento de rollback. Registrar explicitamente qualquer conector ou função antiga que ainda não foi integrado. Não confundir publicação do adaptador com implantação concluída.
