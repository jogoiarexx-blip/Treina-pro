# TreinaPro v2.2 — REV10: demonstrações 2D próprias por exercício

A REV10 substitui 24 SVGs genéricos por demonstrações próprias de:

- **Remada unilateral com halter:** mão e joelho apoiados no banco, halter se desloca próximo ao quadril, sem girar o tronco.
- **Supino na máquina:** encosto, assento, torre de pesos e alças no nível do peito; os braços empurram para a frente.
- **Agachamento búlgaro:** pé traseiro em banco baixo, pé dianteiro fixo e flexão da perna da frente.
- **Step-up:** degrau estável, perna apoiada elevando o corpo e retorno controlado.

Cada exercício teve 6 mídias substituídas: comparativo de posições, quadro inicial, quadro final, modo pausado, animação normal e animação lenta.

Os movimentos são criados com vetores SVG 2D autorais, sem copiar animações de terceiros, e são somente **referências educativas**, não avaliação de técnica nem recomendação de carga.

Os geradores `make_illustrations.py`, `make_animations.py` e `make_frames.py` agora preservam os 10 exercícios refinados nas REV3, REV9 e REV10 para evitar regressões de arte. Não remova `PROTECTED_2D` ao atualizar outros desenhos.

Demais recursos preservados: 29 exercícios, treino ABC e divisão pernas/superiores, metas individuais de séries e repetições, troca de aparelhos, histórico, backups, armazenamento `treinapro-personal-v1`, PWA offline.

Para reconstruir o HTML portátil: `python make_portable.py`. Cache do service worker: `treinapro-v2.2-rev10`.
