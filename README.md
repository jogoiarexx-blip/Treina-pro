# TreinaPro v2.1 — REV7: substituição de exercícios

Inspirado na experiência de treino de projetos abertos, com implementação original e sem copiar código ou mídias externas.

- Botão "Aparelho ocupado? Trocar" nos exercícios do treino atual.
- Sugestões selecionadas do catálogo existente, sem duplicar exercícios do mesmo treino.
- Número de séries planejadas é preservado conforme o exercício original.
- Troca disponível apenas antes de registrar peso, repetições ou concluir séries; nenhuma série anterior é excluída.
- Permite reverter ao exercício original.
- Histórico mantém os exercícios realizados e um mapa `substitutions` de trocas na sessão finalizada.
- Persistência das trocas na sessão existente do localStorage `treinapro-personal-v1` e IndexedDB.
- Treinos ABC, pernas/superiores, 29 exercícios 2D e modo offline mantidos.

Alternativas podem ter técnica, padrão de movimento ou carga diferentes. As sugestões não garantem equivalência biomecânica.

Para gerar arquivo único portátil: `python make_portable.py`.
