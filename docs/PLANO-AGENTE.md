# Conversação e memória do Braingpt

O proprietário escolheu reutilizar uma chave OpenAI existente. Nenhuma chave foi fornecida, criada, copiada ou escrita neste ambiente. Implementar o uso por variável privada na implantação; os testes usam um provedor simulado.

## Entrega

1. Modo de agente opcional com modelo e chave configurados explicitamente. API Responses com function calling e estado local, respeitando o backend independente da especificação. Sem sandbox, shell ou ferramentas irrestritas.
2. Histórico curto e memória pessoal aprovados, cifrados no SQLite com AES-256-GCM e separados por instância/conversa. TTL e limites de tamanho.
3. Propostas estruturadas para lembrar/esquecer fatos. O backend exige uma mensagem exata de confirmação vinculada a código, conversa e prazo, e aplica a mudança atomicamente uma única vez. O modelo não pode confirmar suas próprias ações.
4. Perfil e catálogo explícito das capacidades realmente habilitadas. Não habilitar Calendar/Gmail/Drive/Tasks ou outros conectores sem configuração e testes. Não alegar que uma ferramenta existe só por estar na especificação.
5. Integrar ao webhook preservando deduplicação e prevenção de loops, sem enviar segredos ao modelo ou logs. Limitar duração, chamadas e resposta; falha do modelo não gera sucesso fictício nem reprocessamento.

Testes: configuração fail-closed, isolamento de memória e confirmações, cifra em disco, expiração, consumo único, ciclo de ferramenta do provedor, erros e timeout sanitizados, contexto mínimo, limites do ciclo e fluxo HTTP até a Evolution simulada.

Implantação real continua dependendo do acesso privado ao servidor e da configuração da instância Evolution. Não alterar OpenClaw. O estágio de transporte e seus testes permanecem disponíveis.
