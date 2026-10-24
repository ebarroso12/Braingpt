# Braingpt — escopo funcional recuperado

## Origem e estado das evidências

O proprietário forneceu nesta conversa um texto intitulado “Projeto KIRO via Evolution API”, descrevendo o assistente executivo pessoal originalmente chamado KIRO. Este documento registra o conteúdo sob o nome oficial **Braingpt**.

O texto afirma que as capacidades foram recuperadas do KIRO original e que a versão Evolution API ainda depende de implantação e conexão às ferramentas. Isso é uma descrição funcional fornecida, não uma comprovação de implementação. Posteriormente, o proprietário forneceu os arquivos completos, arquivados com endereços privados removidos em [fontes/PROJETO-EVOLUTION.md](fontes/PROJETO-EVOLUTION.md) e [fontes/HANDOFF.md](fontes/HANDOFF.md). O estado da implementação nova está em [STATUS.md](STATUS.md).

A instalação anterior relatada em docs/RECUPERACAO.md usa uma ponte Codex e socket local. A versão proposta via Evolution API é uma frente distinta, cuja relação com o código anterior precisa ser verificada. Não assumir que a Evolution já está instalada nem substituir a ponte atual sem inspeção e migração.

O Kiro do OpenClaw permanece fora do escopo de alterações.

## Finalidade e interação

Assistente executivo pessoal acessado pelo WhatsApp em linguagem natural. O usuário não precisa de comandos técnicos para operações cotidianas. Deve manter continuidade do pedido e responder com resultados verificáveis, perguntas necessárias ou próximos passos úteis.

Nome usado nas respostas e na documentação do projeto: **Braingpt**.

## Capacidades desejadas

| Área | Solicitações e comportamento |
| --- | --- |
| Agenda | Consultar compromissos, criar, reagendar e cancelar; verificar conflitos e confirmar dados antes de mudanças; lembretes solicitados, inclusive com três horas de antecedência |
| E-mails | Identificar importantes, resumir, avaliar necessidade de resposta e preparar rascunhos em tom solicitado; enviar somente após aprovação |
| Drive e documentos | Buscar contratos/arquivos, resumir PDFs, extrair valores de notas, comparar documentos e organizar arquivos |
| Tarefas e lembretes | Criar, consultar pendências, concluir e lembrar; confirmar ações que alterem tarefas |
| Finanças pessoais | Interpretar mensagens, fotos e PDFs; classificar despesas, consultar totais por período, contas a vencer e recorrências |
| Plantões | Adicionar/remover plantões, consultar e atualizar acumulados; manter regras separadas para diferentes tipos de plantão, inclusive ambulância e referência “Anita” mencionada no texto original |
| Reescrita | Versões profissionais, cordiais, persuasivas, resumidas, amigáveis ou firmes; texto formal e eventual áudio conforme integrações disponíveis |
| Clínica e Injetáveis | Consultas de agenda e estoque, atendimento e encaminhamento à Serena; módulo com permissões próprias e separação dos dados pessoais e de pacientes |
| Legendários / 3 Colinas | Encaminhar solicitações e consultar andamento pelo agente/fluxo responsável; identificar claramente o encaminhamento e não assumir a identidade do outro agente |

Não declarar nenhuma integração disponível sem verificar sua conexão, permissão e resposta real.

## Confirmações e sucesso real

- Agenda: esclarecer data, horário, fuso, duração, local e dados necessários; verificar conflitos; obter confirmação antes de criar, editar ou cancelar.
- E-mail: apresentar rascunho e obter aprovação antes de envio.
- Tarefas: obter confirmação para alterações.
- Boletos, despesas e comprovantes: interpretar; apresentar favorecido, valor e vencimento; obter confirmação; registrar; confirmar conclusão somente após retorno real do sistema.
- Uma falha ou timeout não demonstra que a operação não ocorreu. Verificar o estado antes de tentar novamente ou declarar ausência de mudanças.
- Aprovações e regras desta especificação devem ser implementadas no sistema; não basta incluí-las no texto da persona.

## Automação silenciosa

Pode monitorar e-mails, agenda, tarefas, contas, lembretes e integrações, conforme conexões autorizadas.

Sem novidade relevante, permanecer em silêncio. Não emitir mensagens repetitivas como “Não há novos e-mails”, “Não encontrei nada” ou “A verificação falhou” em cada monitoramento. Isso não elimina o registro operacional sanitizado das falhas.

Não responder a eventos técnicos do WhatsApp como se fossem solicitações do usuário. Eventos [protocolMessage] e mensagens próprias exigem tratamento explícito para impedir ciclos. A causa dos incidentes anteriores ainda precisa ser investigada.

## Restrições fornecidas pelo proprietário

- Não enviar e-mail sem aprovação.
- Não registrar movimentações financeiras sem confirmação.
- Não cancelar evento sem autorização.
- Não expor tokens, senhas ou arquivos .env.
- Não misturar dados pessoais e clínicos.
- Não importar todo o histórico do WhatsApp.
- Não declarar uma ação concluída sem confirmação do sistema.

## Exemplo de fluxo

1. Usuário: “Braingpt, veja minha agenda de amanhã.”
2. Agente consulta a agenda conectada e apresenta os compromissos.
3. Usuário: “Marque uma reunião com João às 15h.”
4. Agente resolve a data relativa no fuso configurado, verifica conflitos e esclarece duração, local e identidade do participante quando necessário.
5. Apresenta a proposta para confirmação.
6. Após aprovação, executa a operação e informa o resultado real.

Não copiar a data fixa de exemplos antigos: “amanhã” depende da data e do fuso da conversa.

## Pendências declaradas no texto recuperado

1. Backend do agente.
2. Webhook da Evolution API.
3. Conexão com o modelo.
4. Memória.
5. Integrações Calendar, Gmail, Drive e Tasks.
6. Sistema de confirmações.
7. Testes com WhatsApp.

Essas pendências dizem respeito à versão Evolution descrita. O código anterior, com núcleo e executores relatados, deve ser recuperado e comparado antes de decidir o que reaproveitar ou implementar.

## Entrega esperada do projeto

Código executável original revisado e consolidado; identidade Braingpt; configurações de exemplo sem segredos; ferramentas e memória documentadas; confirmações implementadas; testes dos fluxos, duplicação e falhas; implantação e rollback documentados; checkpoint indicando quais módulos funcionam e quais continuam pendentes.

Este documento é a especificação funcional recuperada. Não significa que as capacidades acima já estejam funcionando.
