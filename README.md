# TreinaPro v2.5 REV13 — novas artes 2D visíveis no aplicativo

A REV12 apenas convertia os desenhos anteriores. A REV13 traz **quatro novas ilustrações autorais com atletas e equipamentos**, criadas especificamente para diferenciar o visual do aplicativo: supino na máquina, leg press, desenvolvimento de ombros e face pull.

Elas aparecem em **Movimentos em destaque** na tela inicial, na imagem principal do treino e nas quatro fichas correspondentes da biblioteca. Cada card abre o guia 2D animado original, para evitar que a arte estática substitua uma demonstração técnica.

Arquivos de origem: `assets/featured/svg/*.svg` (quatro artes diferentes); arquivos publicados: `assets/featured/*.webp`.

O gerador `build_webp_assets.py` e o GitHub Actions convertem os quatro SVG em WebP e os publicam automaticamente, além dos 121 assets estáticos anteriores. O app faz fallback para o SVG novo se o WebP ainda não estiver disponível.

Serviço offline: `treinapro-v2.5-rev13`. Histórico, perfis, planos, séries/repetições e 29 animações 2D preservados. Os novos quadros são ilustrativos e não substituem instrução biomecânica.

## Confirmação REV13
As quatro artes **novas** foram geradas em WebP (supino na máquina, leg press, desenvolvimento e face pull) e publicadas no repositório. Para ver imediatamente: abra a página inicial do TreinaPro e procure **Movimentos em destaque**. O cabeçalho do treino também usa a nova arte. A REV12 apenas convertia os SVGs já existentes; esta revisão cria novos desenhos e uma seção visível.
