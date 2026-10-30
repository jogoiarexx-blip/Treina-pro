# TreinaPro v2.8 — REV15: execução da auditoria de 30/10/2026

Esta revisão aplica itens prioritários da auditoria técnica anterior, preservando IDs de planos e exercícios, chave `treinapro-personal-v1`, registros de séries/cargas, exportação e importação JSON.

## Implementado

- **Mobile:** barra fixa na demonstração do exercício para ir diretamente ao registro de séries, contador atualizado durante o treino, controles de pelo menos 44px e campos numéricos adequados à digitação no celular.
- **Treinos interrompidos:** o início do treino passa a indicar `Retomar treino salvo`; troca de dia e divisão pergunta quando a sessão atual possui dados, sem excluí-los.
- **Acessibilidade:** foco inicial e retorno do foco ao acionador após modais; Tab/Shift+Tab contidos no diálogo; Escape fecha os modais de exercícios, trocas e editor, e o onboarding mantém o foco no formulário.
- **Evolução:** filtro de métricas e histórico de 7, 30 ou 90 dias, sem apagar o histórico completo; o gráfico de 7 dias e o resumo de 28 dias continuam com títulos próprios.
- **Equipamentos:** preferência opcional de máquinas, polias, pesos livres ou corpo livre; usada na biblioteca e para ordenar alternativas de treino, sem modificar rotinas antigas.
- **Orientações:** os 29 exercícios têm lista de 3 pontos de atenção para acompanhar os desenhos educativos. Isso **não** certifica exatidão biomecânica.
- **Offline:** contador de arquivos efetivamente armazenados e indicação clara quando há downloads incompletos; a revisão do SW é `treinapro-v2.8-audit1`.
- **Dados:** recuperação do perfil armazenado no IndexedDB não deixa mais a interface bloqueada por uma tela de boas-vindas anterior.
- **Marca:** logos SVG, favicon, ícones PNG e manifesto PWA atualizados na revisão anterior.

## Qualidade e testes

- `node tests/audit-smoke.cjs` verifica a sintaxe dos scripts, 29 exercícios e seus 290 arquivos visuais vinculados, integridade de IDs e recursos críticos.
- `tests/mobile-smoke.spec.cjs` automatiza com Playwright/Chromium as telas de boas-vindas, filtro da biblioteca, foco de modal, filtros da evolução, retomada de treino, cancelamento de troca, backup e recuperação pelo IndexedDB.
- `.github/workflows/audit-qa.yml` executa os testes após alterações na branch main. **Testes configurados não equivalem a resultado aprovado**; consulte as execuções do GitHub Actions antes de declarar aprovação.
- Revisão física de posturas/aparelhos dos 29 SVG, testes em celulares reais, diagnóstico de desempenho e refatoração de módulos ainda são pendências.

## Links

- Aplicativo: https://jogoiarexx-blip.github.io/Treina-pro/
- Código: https://github.com/jogoiarexx-blip/Treina-pro
- CI: https://github.com/jogoiarexx-blip/Treina-pro/actions/workflows/audit-qa.yml

---

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
