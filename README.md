# TreinaPro v2.1 — REV8: edição individual de treinos

A REV8 permite editar exercícios de cada dia de treinamento, mantendo os planos ABC e pernas/superiores como modelos originais.

- Adicione exercícios escolhidos entre os 29 movimentos 2D (até 10 por dia).
- Troque exercícios por opções do mesmo grupo muscular principal.
- Reordene usando botões para subir/descer e remova exercícios (mínimo de 1 por dia).
- Restaure os exercícios originais de um dia, sem afetar as outras sessões.
- Mais alternativas para troca temporária de aparelho ocupado na REV7.
- Contadores e progresso calculados sobre o treino efetivo, não sobre a lista de fábrica.
- As edições persistem por programa e por dia em `customWorkouts`, na mesma chave de dados `treinapro-personal-v1`, com cópia em IndexedDB.
- Editar é bloqueado após qualquer peso, repetição ou série registrada no dia, evitando perda acidental de dados.
- Histórico de treinos novos passa a salvar `exerciseOrder` com a ordem e o exercício realmente executado.
- Demonstrativos SVG, offline, perfil, backups e planos originais mantidos.

Não foi incorporado código AGPL nem imagens de terceiros.
