# Instruções do projeto Braingpt

## Pedido autorizado pelo proprietário

Consolidar TODO o projeto independente anteriormente chamado Kiro em https://github.com/ebarroso12/Braingpt, revisar sua arquitetura, aplicar a identidade Braingpt e torná-lo um agente documentado e mantível. Não se limitar a trocar o texto de uma resposta ou criar um esqueleto substituindo código existente.

## Limite obrigatório

Não modificar o Kiro do OpenClaw, arquivos em /root/.openclaw ou serviços/configurações do OpenClaw. O projeto independente de origem relatado está em /srv/codex-whatsapp-workspace/kiro.

## Estado no início desta recuperação

Este repositório contém documentação de recuperação, não o código executável original. Os detalhes em docs/RECUPERACAO.md são evidências relatadas por uma inspeção na máquina de origem; confirme-os antes de agir. Não alegue que o código foi importado, que testes passaram ou que produção foi atualizada sem verificar.

## Como continuar sem perder o projeto

1. Leia README.md e docs/RECUPERACAO.md; inspecione a origem e suas instruções locais.
2. Preserve alterações existentes, configuração e estado operacional antes de migrar.
3. Importe o código original, seus testes e recursos necessários. Não faça git init ou force-push na origem; use uma cópia de trabalho isolada. Mantenha estes documentos e registre a proveniência da importação.
4. O destino é público: revise tanto arquivos quanto histórico antes do push. Não publique credenciais, .env reais, sessões, conversas, contatos, logs ou estado operacional. Preserve histórico apenas se puder publicá-lo; caso contrário, importe um snapshot limpo e documente o motivo.
5. Faça o inventário das capacidades reais: entrada, roteamento, ciclo do agente, ferramentas, memória, autorização, executores, persistência, observabilidade e recuperação de falhas. Separe existente, verificado, ausente e planejado.
6. Aplique Braingpt como identidade do projeto e do agente. Faça migração explícita de nomes técnicos quando necessária, com compatibilidade e reversão; não substitua todas as ocorrências de Kiro indiscriminadamente.
7. Investigue a origem dos eventos técnicos, as respostas duplicadas e a falha do executor antes de corrigir. Use testes com eventos sintéticos, sem mensagens reais ao WhatsApp.
8. Versione instalação reproduzível, exemplos sem segredos, instruções de operação e testes. Atualize README.md e um checkpoint a cada entrega.
9. Não reinicie a ponte que conduz a execução atual sem garantir a entrega do resultado e a preservação de filas. Não envie mensagens a terceiros como teste.
10. Ao concluir, informe commit publicado, testes e resultados, limitações e estado de aplicação no servidor.

## Critério de conclusão

O código original revisado está no repositório Braingpt; a identidade está consistente; instalação e configuração são documentadas; capacidades do agente são demonstradas; os fluxos alterados são testados; está claro o que foi aplicado no servidor e o que falta. Documentação inicial sozinha não satisfaz o pedido.
