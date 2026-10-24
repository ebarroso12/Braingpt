# Recuperação e consolidação do Braingpt

## Atualização após recebimento do handoff

O proprietário forneceu a especificação e o handoff completos da proposta Evolution. Uma implementação nova da primeira tarefa foi criada como Braingpt, sem importar ou alterar o código da instalação anterior descrita abaixo. Consulte [STATUS.md](STATUS.md) para o estado atual e [fontes/HANDOFF.md](fontes/HANDOFF.md) para o contexto sanitizado. As afirmações seguintes registram a investigação inicial e não devem ser confundidas com o estado da nova implementação.

## Checkpoint histórico da investigação inicial

- Identidade definida pelo proprietário: **Braingpt**.
- Destino autorizado: https://github.com/ebarroso12/Braingpt.
- O comando anterior que propunha apenas renomear a identidade não foi enviado, segundo o proprietário.
- Foi recebido um relatório de inspeção da sessão Codex `01a16eed`, projeto `main`.
- O relatório declarou não ter alterado arquivos ou reiniciado serviços.
- Nesta recuperação foi verificado acesso de escrita ao repositório, antes vazio.
- A máquina disponível nesta conversa não contém a origem em /srv; não há acesso configurado ao servidor.
- O código executável, os oito commits relatados e as configurações de exemplo ainda precisam ser recuperados.

## Mapa relatado da instalação

```text
WhatsApp
  -> controller-daemon.mjs
  -> controller-bridge.mjs
  -> relay-adapter.mjs
  -> /run/kiro/relay.sock
  -> kiro-core / src/server.mjs
  -> Kiro.process()
  -> executor Claude ou Codex
  -> retorno pelo relay
```

| Componente | Local relatado |
| --- | --- |
| Projeto independente | /srv/codex-whatsapp-workspace/kiro |
| Ponte principal | /opt/codex-whatsapp-relay |
| Segunda ponte | /opt/codex-whatsapp-relay-personal |
| Serviço do núcleo | kiro-core.service |
| Serviços das pontes | codex-whatsapp-relay.service, codex-whatsapp-relay-personal.service |

Não confundir com o agente de mesmo nome do OpenClaw. Não migrar conteúdo do OpenClaw como se pertencesse ao Braingpt.

## Evidências de código recebidas

Estas referências precisam ser confirmadas na origem; números de linha podem mudar.

| Referência na origem | Função relatada |
| --- | --- |
| src/kiro.mjs:23 | Classificação do pedido |
| src/kiro.mjs:35 | Chamada ao executor |
| src/kiro.mjs:39 | Catch global com resposta genérica de falha |
| src/kiro.mjs:41 | Persistência e devolução da resposta |
| src/executors.mjs:21 | Tratamento de falhas do executor |
| src/relay-adapter.mjs:3 | Decisão de roteamento |
| src/relay-adapter.mjs:6 | Pedido ao socket local |
| src/relay-adapter.mjs:7 | Resposta ao WhatsApp |
| src/server.mjs:19 | Endpoint local /message |
| src/server.mjs:29 | Socket local |
| deploy/patch-relay.py | Integração da ponte |
| tests/executor.test.mjs:34 | Expectativa de resposta quando o executor falha |

O tratamento relatado em src/kiro.mjs é:

```js
catch (e) {
  reply = `O Kiro não concluiu esta solicitação: ${sanitize(e.message)}. Nenhuma alteração em produção foi confirmada.`;
}
```

Um catch genérico não comprova a causa de uma falha nem garante ausência de efeitos parciais. Verificar o ciclo completo e os registros sanitizados do executor.

## Plano de recuperação do código

1. Na máquina de origem, ler instruções locais e verificar Git, alterações pendentes, dependências e arquivos não versionados necessários.
2. Preparar cópia isolada de código, testes, lockfile, exemplos e recursos de instalação. Excluir dados pessoais, credenciais, conversas e estado operacional. Não copiar cegamente a pasta inteira para um repositório público.
3. Revisar histórico antes de preservá-lo. Se inadequado para publicação, usar snapshot limpo e registrar a proveniência sem publicar conteúdo removido.
4. Integrar ao repositório Braingpt preservando os documentos atuais, sem force-push.
5. Inventariar as capacidades reais e projetar as partes ausentes a partir do código, mantendo os executores e integrações úteis.
6. Aplicar a identidade Braingpt a pacote, documentação, persona e respostas. Planejar separadamente mudanças de caminhos, sockets, serviços e importações para manter compatibilidade.
7. Reproduzir com testes as falhas de entrada, duplicação e execução. Corrigir a causa confirmada.
8. Registrar comandos reais de instalação, operação, testes e rollback. Aplicar ao servidor quando a continuidade da ponte estiver garantida.

## Capacidades a comprovar

| Área | O que verificar |
| --- | --- |
| Identidade | Persona, objetivo, limites e nome Braingpt |
| Recepção | Eventos de usuário versus eventos de protocolo; mensagens próprias |
| Coordenação | Roteamento, planejamento, ciclo de ferramenta e encerramento |
| Ferramentas | Quais existem, autenticação e escopo de acesso |
| Memória | O que persiste, por usuário/projeto/sessão e por quanto tempo |
| Permissões | Aprovação de ações, controle de acesso e auditoria |
| Execução | Claude/Codex, timeout, cancelamento e diagnóstico de falhas |
| Entrega | Idempotência, filas, novas tentativas e prevenção de duplicação |
| Operação | Saúde, logs sanitizados, recuperação e checkpoint |

Uma capacidade descrita em um prompt não deve ser marcada como implementada sem código e evidência de funcionamento.

## Validação necessária

- Evento de protocolo não produz resposta pedindo texto.
- Uma mensagem recebida e reentregue produz no máximo uma execução e uma resposta, conforme a política definida.
- Mensagens do próprio sistema não iniciam ciclos de resposta.
- Falha do executor registra diagnóstico útil sem revelar segredos.
- Retentativas não duplicam ações nem notificações.
- Nome Braingpt aparece nos fluxos definidos.
- Nenhum arquivo ou serviço do OpenClaw é alterado.
- Instalação documentada pode ser reproduzida em ambiente isolado.
- Resultados reais dos testes e limitações ficam versionados.

## Como retomar na máquina correta

A ponte que respondeu /project e /ls possui acesso à máquina de origem. O executor dessa máquina deve ler este repositório e concluir a recuperação conforme AGENTS.md. Esta conversa consegue editar o repositório GitHub, mas não consegue ler diretamente o disco daquela máquina ou controlar suas sessões Codex.
