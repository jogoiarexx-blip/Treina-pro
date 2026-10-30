# TreinaPro v2.4 — REV12: pacote visual WebP

## Imagens integradas
A revisão cria **121 WebP** para os recursos estáticos:
- **29 imagens de exercícios** em `assets/webp/exercises/`.
- **58 imagens de etapas** em `assets/webp/frames/start` e `frames/finish`.
- **29 imagens pausadas** em `assets/webp/still`.
- **5 imagens de interface** em `assets/webp/ui`: marca, hero, biblioteca, histórico vazio e offline.
- As animações **normal e lenta continuam em SVG**, evitando perder movimento e resolução.
- Se o WebP não carregar por causa de um cache antigo, a interface retorna automaticamente ao SVG original.

## Geração e publicação
O script `build_webp_assets.py` gera os arquivos WebP a partir dos SVGs autorais corrigidos (CairoSVG e Pillow). O fluxo `.github/workflows/build-webp.yml` converte, valida 121 WebP e adiciona os arquivos à branch principal.

Para regenerar localmente:
```sh
python -m pip install pillow cairosvg
python build_webp_assets.py
```

O cache offline `treinapro-v2.4-rev12` inclui os WebP e as demonstrações animadas; manutenção da chave de dados `treinapro-personal-v1`, planos, histórico e metas.
