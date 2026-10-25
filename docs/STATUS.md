# Checkpoint do Braingpt

## Estado desta entrega

**Direção atual:** integrar na ponte WhatsApp Codex já usada ao escrever para si mesmo. Não migrar o canal para Evolution. Adaptador e launcher preparados; aplicação na VPS ainda pendente por falta de acesso ao código instalado e ao servidor. Consulte [APLICAR-NA-PONTE-EXISTENTE.md](APLICAR-NA-PONTE-EXISTENTE.md).

Backend Evolution e modo opcional de agente OpenAI implementados a partir da especificação e do handoff fornecidos pelo proprietário. Nome oficial Braingpt. O proprietário escolheu reutilizar uma chave existente, que será fornecida pelo ambiente privado na implantação; nenhuma chave real foi criada ou copiada aqui.

**Ainda não é o assistente completo e não foi implantado no WhatsApp de produção.**

## Entregue e verificado

- [x] Endpoints de saúde e webhook.
- [x] Configuração validada, segredo dedicado e allowlist de remetentes.
- [x] Normalização de texto e filtros de protocolo, instância, direção e tipo.
- [x] SQLite, reserva atômica, rate limit por remetente e auditoria sem dados brutos.
- [x] Adapter Evolution, validação de retorno e tratamento de timeout sem retry cego.
- [x] Testes de reentrega, reinício, concorrência entre processos e envios incertos.
- [x] Modo de transporte com resposta fixa e modo opcional de agente com modelo configurado explicitamente.
- [x] Contexto curto cifrado e preferências pessoais enumeradas, isolados por conversa.
- [x] Propostas de lembrar/esquecer preferências, com confirmação humana expiráveis e de uso único.
- [x] Arquivos de origem sanitizados, instruções para agentes, instalação e desligamento.
- [x] 86 testes passando e verificação estática TypeScript passando.
- [x] Revisão independente do transporte e do agente; três achados de memória/expiração corrigidos com regressões que falharam antes da correção e passaram depois.
- [x] Adaptador da ponte existente sem novas credenciais Evolution ou novo cliente WhatsApp.
- [x] Tratamento de self-chat, envelopes de áudio, eco antes de ACK, timeout e drenagem dos lotes já aceitos, com testes de regressão.
- [x] Revisão da integração contra a interface pública inspecionada; achados de envelopes de áudio e drenagem corrigidos com testes RED→GREEN.

Comandos: `npm run typecheck` e `npm test`. Os testes usam servidor HTTP local simulando a Evolution, remetentes sintéticos e segredos exclusivos de teste. Não acessam contas ou instâncias reais.

## Não executado

- [ ] Recuperação/importação do código antigo completo do servidor e comparação dos hooks modificados.
- [ ] Aplicação e verificação ao vivo do adaptador na ponte Codex existente.

- [ ] Build e execução Docker no host de destino (configuração fornecida, ainda não validada em execução).
- [ ] Confirmação do contrato/autenticação na versão real da Evolution instalada.
- [ ] Conexão controlada a uma instância WhatsApp e validação ponta a ponta real.
- [ ] Teste real com a chave existente e o modelo escolhido; adapter e ciclo de conversa já implementados com teste simulado.
- [ ] Expansão da memória para fatos além das preferências enumeradas e escopos adicionais com políticas próprias.
- [ ] Ferramentas Calendar, Gmail, Drive, Tasks e demais domínios.
- [ ] Confirmações para ações de domínio (as de memória pessoal já estão implementadas).
- [ ] Áudio, imagem e documentos.
- [ ] Automações silenciosas e encaminhamento a agentes com conectores reais.

## Relação com os sistemas anteriores

1. **Kiro do OpenClaw:** não alterado; forneceu referências históricas de comportamento.
2. **Kiro independente na ponte Codex:** foi localizado por um relatório em `/srv/codex-whatsapp-workspace/kiro`. A instalação relatada pode enviar as mensagens antigas sem a Evolution nova existir. Seu código não está recuperado aqui, e seus erros não foram corrigidos remotamente nesta entrega.
3. **Braingpt Evolution:** novo código versionado neste repositório. Sem implantação, não substitui automaticamente nenhum dos anteriores.

Não afirmar estado atual dos serviços antigos a partir de inventários históricos. Não alterar OpenClaw para implantar Braingpt.

## Decisões de implementação

- Foi implementada a primeira tarefa expressamente recomendada pelo handoff, em vez de aguardar o código antigo inacessível. O custo é precisar comparar/recuperar recursos úteis daquele sistema depois; não há alegação de importação completa.
- Node 24 executa TypeScript e SQLite nativamente. Dependências de desenvolvimento servem à checagem de tipos, sem dependências npm em execução.
- Reserva durável sem retry automático prioriza evitar duplicação. Um crash pode deixar uma resposta sem envio; isso está registrado e exige investigação, não promessa de exatamente uma entrega.
- O modo de transporte mantém aviso fixo. O modo de agente conversa pelo modelo configurado e só tem ferramentas de memória pessoal controlada; não se deve apresentá-lo como assistente com todos os conectores.
- Memória durável livre foi restringida a preferências enumeradas para impedir que diagnósticos ou credenciais sejam gravados por esse caminho. Esquecer uma preferência também limpa o contexto curto. A expiração da confirmação é verificada após obter o bloqueio SQLite.

## Próxima etapa

Disponibilizar acesso ao ambiente que já executa a ponte, recuperar seu código e aplicar o procedimento de [APLICAR-NA-PONTE-EXISTENTE.md](APLICAR-NA-PONTE-EXISTENTE.md). Não iniciar uma segunda conexão sobre a mesma sessão nem trocar para Evolution. Depois integrar os conectores/executores antigos úteis com confirmação e escopos próprios. A autorização foi dada; os acessos privados não estão disponíveis nesta sessão.

Não publicar credenciais, telefones, memória pessoal, sessões ou histórico bruto. O repositório é público.
