# Checkpoint do Braingpt

## Estado desta entrega

Primeiro backend Evolution implementado a partir da especificação e do handoff fornecidos pelo proprietário. Nome oficial Braingpt. O repositório contém código executável e documentação de continuidade.

**Ainda não é o assistente completo e não foi implantado no WhatsApp de produção.**

## Entregue e verificado

- [x] Endpoints de saúde e webhook.
- [x] Configuração validada, segredo dedicado e allowlist de remetentes.
- [x] Normalização de texto e filtros de protocolo, instância, direção e tipo.
- [x] SQLite, reserva atômica, rate limit por remetente e auditoria sem dados brutos.
- [x] Adapter Evolution, validação de retorno e tratamento de timeout sem retry cego.
- [x] Testes de reentrega, reinício, concorrência entre processos e envios incertos.
- [x] Resposta fixa de diagnóstico que informa os recursos ainda não conectados.
- [x] Arquivos de origem sanitizados, instruções para agentes, instalação e desligamento.
- [x] 48 testes passando e verificação estática TypeScript passando.
- [x] Revisão independente do backend de transporte sem achados críticos ou importantes.

Comandos: `npm run typecheck` e `npm test`. Os testes usam servidor HTTP local simulando a Evolution, remetentes sintéticos e segredos exclusivos de teste. Não acessam contas ou instâncias reais.

## Não executado

- [ ] Build e execução Docker no host de destino (configuração fornecida, ainda não validada em execução).
- [ ] Confirmação do contrato/autenticação na versão real da Evolution instalada.
- [ ] Conexão controlada a uma instância WhatsApp e validação ponta a ponta real.
- [ ] Modelo de conversa.
- [ ] Memória de perfil, memória durável aprovada e histórico curto.
- [ ] Ferramentas Calendar, Gmail, Drive, Tasks e demais domínios.
- [ ] Pendências e confirmações humanas estruturadas para ações de domínio.
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
- Sem modelo ou ferramentas nesta fase, as mensagens recebem um aviso fixo e honesto. Não se deve disponibilizar esta etapa como assistente completo ao usuário final.

## Próxima etapa

Validar o transporte com uma instância controlada, sem modificar uma produção existente. Depois conectar o modelo escolhido e implementar memória e ferramentas por escopo, começando por leitura e só depois escrita com confirmação. Antes de qualquer implantação real, confirmar configuração, impacto e autorização, conforme o handoff.

Não publicar credenciais, telefones, memória pessoal, sessões ou histórico bruto. O repositório é público.
