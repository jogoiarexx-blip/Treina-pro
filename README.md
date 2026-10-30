# TreinaPro v2.2 — REV9: séries/repetições individuais e demonstrações 2D específicas

## Personalização
- Dentro de **Editar treino**, cada exercício possui o botão **Séries/reps**.
- Cada dia de cada programa tem metas independentes, com **1 a 8 séries**, repetições (como `8–12`) ou duração (como `30 s`).
- Valores são validados antes de salvar; o contador de séries, registro e histórico seguem as metas.
- Metas são armazenadas em `state.workoutTargets[programa][dia][exercícioOriginal]` dentro da chave anterior `treinapro-personal-v1` e IndexedDB existente.
- O usuário pode restaurar a meta padrão de um exercício ou o dia inteiro.
- Mudanças ficam bloqueadas se o treino do dia tiver peso, repetições ou séries registrados. Não se modificam logs históricos.
- Após finalizar, o histórico registra `exerciseOrder` com séries, repetições planejadas e o exercício realizado.
- Alternativas do mesmo grupo muscular passam a ser reconhecidas também depois de reabrir o aplicativo.

## Demonstrações 2D
- **Face pull**: personagem em pé, corda da polia alta se aproximando do rosto, com cotovelos se movendo.
- **Coice na polia**: tornozeleira, polia baixa e perna de trabalho estendendo para trás com o tronco apoiado.
- Foram substituídos os 12 SVGs correspondentes: comparativos, quadros inicial/final e animações normal/lenta/pausada.
- As mídias são desenhos SVG próprios do projeto; não foram copiadas animações de openGym/Gym visual.
- **Atenção ao manter o código:** os geradores antigos `make_illustrations.py`, `make_frames.py`, `make_animations.py` e `make_rev3_2d.py` ainda usam variantes genéricas e podem sobrescrever essas melhorias se executados novamente. Mantenha os SVGs específicos da REV9 quando regenerar o catálogo.

Perfil, backups, modo offline, histórico, programas e os demais 27 exercícios 2D são preservados. As animações são guias esquemáticos, não uma avaliação da postura nem substitutos de supervisão profissional.
