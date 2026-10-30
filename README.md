# TreinaPro v2.3 — REV11: quatro demonstrações 2D individualizadas

## Desenhos refeitos

- **Mesa flexora deitada (`flexora`)**: banco longo, quadril apoiado, eixo do joelho e rolo que acompanha o tornozelo enquanto a perna flexiona. O catálogo descreve *mesa flexora*, não cadeira flexora sentada.
- **Remada baixa sentada (`remada_baixa`)**: torre de pesos, cabo e pegador, apoio dos pés e banco; os braços puxam o pegador na direção da cintura sem mover o tronco.
- **Desenvolvimento de ombros (`desenvolvimento`)**: vista frontal, dois halteres, assento/encosto; cada braço empurra os halteres acima da cabeça.
- **Crucifixo com halteres (`crucifixo`)**: vista superior do banco; halteres se afastam em arco com cotovelos levemente flexionados, evitando confundí-lo com supino.

Cada exercício agora possui seis arquivos SVG próprios: comparação de posições, quadro inicial, quadro final, pausado, animação normal e animação lenta. Total: **24 SVGs substituídos**.

**Não copiar/regerar por engano:** `PROTECTED_2D` em `make_illustrations.py` protege os 14 exercícios refinados nas REV3/9/10/11. `make_animations.py` e `make_frames.py` leem a mesma proteção para não sobrescrever as mídias. Gerar novas variantes genéricas não atualiza esses exercícios; suas mídias 2D têm edição individual.

## Preservações

29 exercícios do catálogo, séries e repetições individuais, troca de aparelho, personalização dos planos ABC e pernas/superiores, registro de cargas, histórico, perfis, backups, armazenamento `treinapro-personal-v1`, serviço offline e PWA.

As ilustrações são esquemáticas e educativas, não uma avaliação de postura ou recomendação de carga. Não foram copiadas mídias de openGym/Gym visual.

## Publicação

Versão PWA: `treinapro-v2.3-rev11`. Arquivo portátil: `python make_portable.py`.
