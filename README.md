# TreinaPro v2.6 — REV14: todos os 29 exercícios com 2D individualizado

## Evolução dos desenhos técnicos
A REV14 substitui **90 SVGs** (6 arquivos para cada um dos 15 exercícios que ainda usavam modelos genéricos):
- `supino_inclinado`
- `elevacao_lateral`
- `triceps_polia`
- `triceps_frances`
- `puxada_alta`
- `rosca_direta`
- `rosca_martelo`
- `afundo`
- `romeno`
- `panturrilha`
- `prancha`
- `hip_thrust`
- `abdutora`
- `agachamento_goblet`
- `abdominal`

Cada exercício possui agora um comparativo inicial/final, quadros inicial/final, versão pausada, animação normal e animação lenta. Os desenhos são SVGs vetoriais próprios com equipamentos e trajetórias diferenciados. **Os 29 exercícios do catálogo foram individualizados** ao longo das revisões REV3–REV14.

Os 15 exercícios foram incluídos em `PROTECTED_2D` de `make_illustrations.py`: o conjunto agora cobre os **29 exercícios**, e `make_animations.py` e `make_frames.py` respeitam essa proteção.

O workflow `.github/workflows/build-webp.yml` atualiza automaticamente os WebP das miniaturas, posições e pausas, sem converter as demonstrações animadas em imagens estáticas. O total do pacote continua 125 WebP, incluindo as quatro ilustrações em destaque da REV13.

## Correção de atualização / cache
A nova versão do service worker é `treinapro-v2.6-rev14`. Durante a migração, ele não reutiliza as imagens antigas desses 15 exercícios: faz novos downloads. Isso evita mostrar desenhos obsoletos depois da publicação. Os demais recursos offline podem ser migrados normalmente.

As séries e repetições, histórico, programas ABC e pernas/superiores, backups e chave `treinapro-personal-v1` permanecem compatíveis.

**Limite:** os desenhos são representações educativas 2D, não análises biomecânicas nem instruções personalizadas de segurança. Ainda é necessária revisão visual em dispositivos físicos.
