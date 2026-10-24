# Braingpt

Projeto do agente pessoal integrado ao WhatsApp, originado de uma implementação independente criada pelo Codex com o nome Kiro.

**Estado atual: recuperação e consolidação. O código executável do servidor ainda não foi importado neste repositório. Este repositório não é uma instalação funcional do agente.**

## Objetivo

Reunir código, identidade, configuração de exemplo, testes e documentação em um único projeto rastreável, para que sua localização e funcionamento não dependam de uma conversa anterior.

Nome oficial: **Braingpt**.
Repositório canônico: https://github.com/ebarroso12/Braingpt.

## Onde está a implementação existente

O relatório de inspeção fornecido pelo proprietário identificou:

- Diretório de origem: `/srv/codex-whatsapp-workspace/kiro`.
- Branch local: `feat/kiro-server`.
- Pacote: `kiro-server`.
- Serviço: `kiro-core.service`.
- Primeiro commit relatado: `594b543`.
- Entrada: ponte WhatsApp Codex, com duas instalações relatadas em `/opt/codex-whatsapp-relay` e `/opt/codex-whatsapp-relay-personal`.

Essas informações provêm do relatório da outra máquina. Nesta etapa, o código não pôde ser inspecionado diretamente. A branch e o commit relatados não foram localizados pela busca realizada no GitHub.

**Este projeto é independente do Kiro do OpenClaw. O proprietário determinou que o OpenClaw não seja alterado.**

## O que o sistema faz hoje

Segundo o relatório, recebe uma solicitação pela ponte WhatsApp, encaminha ao núcleo local, classifica o pedido e chama um executor Claude ou Codex. A resposta volta pela ponte.

Isso demonstra uma integração com executores. Ainda é necessário examinar o código para comprovar ferramentas disponíveis, memória, planejamento, limites de autonomia, autorização e recuperação de falhas. Não há confirmação de um GPT personalizado na interface do ChatGPT.

## Problemas relatados

- Respostas repetidas a eventos `[protocolMessage]`.
- Falha genérica `claude retornou erro (1)`, sem causa confirmada.
- Avisos de falha duplicados.
- Confusão entre o nome do agente independente e o agente do OpenClaw.
- Falta de uma fonte de código e documentação centralizadas.

## Continuidade

Leia [o mapa e o plano de recuperação](docs/RECUPERACAO.md) e as [instruções para agentes](AGENTS.md).

A próxima etapa é recuperar o código existente da máquina de origem, revisar os arquivos destinados ao repositório público, aplicar a identidade Braingpt e validar o funcionamento. Não reconstruir o sistema a partir deste resumo como se fosse o código original.
