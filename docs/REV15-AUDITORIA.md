# TreinaPro REV15 / v2.8 — fechamento da auditoria

Data: 30/10/2026  
Base: v2.6 REV14 + identidade v2.7  
Publicação: branch `main` do repositório `jogoiarexx-blip/Treina-pro`

## Antes e depois

| Área | Antes | Depois desta revisão | Limite |
|---|---|---|---|
| Treino interrompido | sessão persistia, sem chamada de retomada evidente | botão “Retomar treino salvo” e confirmação ao trocar de dia/plano | não há sincronização entre aparelhos |
| Mobile | guia visual comprido antes de chegar às séries | atalho sticky “Registrar séries”, contagem imediata, alvos de toque ampliados | depende de QA físico |
| Acessibilidade | foco inicial em alguns modais, sem retenção de Tab / retorno universal | foco contido e devolvido nos modais, onboarding com foco inicial | não certificado com leitor de telas |
| Evolução | métricas totais e gráfico recente | filtro 7/30/90 dias para indicadores e histórico | gráfico 7 dias e mapa 28 dias têm períodos próprios |
| Equipamentos | filtro manual na biblioteca | preferência persistente, ordenação de trocas/edição e biblioteca preferencial | não reescreve o plano automaticamente |
| Exercícios | 29 demonstrações 2D individuais, com 3 pontos de atenção apenas em parte do catálogo | 3 pontos de atenção em todos os 29 exercícios | desenhos ainda exigem revisão humana de precisão |
| Offline | conclusão contava tentativas, não necessariamente itens armazenados | progresso do cache atual e indicação de itens faltando | interrupções de rede podem exigir nova tentativa |
| Recuperação de dados | restaurar IndexedDB poderia fechar onboarding sem liberar interface | restauração limpa o estado `inert` adequadamente | dados permanecem locais, exportação recomendada |
| Marca | marca nova sem garantia inicial de ícone PNG instalado | favicon, PWA SVG e PNG 192/512 atualizados | checagem visual Android/iOS pendente |

## Testes disponíveis

1. `node tests/audit-smoke.cjs`: sintaxe JS, 29 IDs únicos, 290 recursos SVG/WebP, planos, chave de dados e marca.
2. `npx playwright test tests/mobile-smoke.spec.cjs --browser=chromium`: cadastro, biblioteca, modais, janela de período, retomada, confirmação de troca, backup e IndexedDB.
3. `.github/workflows/audit-qa.yml`: instala as dependências e executa os testes em `main`.

**Importante:** incluir um teste no workflow não significa que ele já passou. Seu resultado deve ser acompanhado no GitHub Actions. Esta sessão confirmou gravação dos arquivos e das mudanças no GitHub; não confirmou execução interativa real em aparelhos nem sucesso final do Pages.

## Próximas prioridades

- Revisão geométrica/biomecânica manual dos 29 movimentos (equipamento, articulações, trajetória, pegada e apoio); documentar aprovação individual.
- Testes reais em 320, 360, 390, 430 e 768px, teclado, VoiceOver e TalkBack.
- Separar `app.js` por módulos para reduzir risco de regressões.
- Testes de perda de rede, consumo de cache, atualização PWA e retorno após fechar o aplicativo.
- Sincronização opcional entre aparelhos apenas com consentimento e uma solução segura de conta; não presumir armazenamento na nuvem.

## Garantias de migração

As chaves de armazenamento `treinapro-personal-v1`, os IDs dos planos `abc` e `quad`, os 29 IDs de exercícios e o formato de backup v2 permanecem inalterados. Preferência de equipamento é opcional, validada na carga/restauração e não altera sessões antigas.
