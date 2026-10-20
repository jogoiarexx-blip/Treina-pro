# TreinaPro Personal Digital v1.9

Evolução incremental da versão 1.8. **Mesmo armazenamento `treinapro-personal-v1`**: não altera perfis, registros, planos, carga nem histórico.

## Melhorias concretas

- **Leg press 45°:** joelho calculado por segmentos de comprimento constante; plataforma e trilhos movem-se sincronizados com os pés.
- **Cadeira extensora:** joelho fica fixo, tornozelo percorre um arco e rolo móvel acompanha a canela.
- **Agachamento búlgaro:** pé traseiro apoiado em banco e pé dianteiro estável.
- **Step-up:** apoio do pé e banco/caixa representados, corpo sobe de forma mais clara.
- **Coice na polia:** boneco em pé com um pé plantado e outra perna estendendo o quadril; cabo acompanha tornozeleira.
- **Cadeira abdutora:** apoios laterais seguem os joelhos.
- **Hip thrust:** barra acompanha elevação da pelve.
- **11 exercícios de pernas e glúteos:** três alertas visuais curtos no modo 3D; outros exercícios mantêm orientações antigas.
- **Baixo consumo:** mantém limites de quadros e pausa em segundo plano. Com animação pausada, arrastar ou redimensionar repinta a cena.
- **Sem aumento de complexidade:** guias Animado / Etapas / 3D, botões e histórico preservados.

**Atenção:** os modelos seguem sendo esquemáticos e não são validados por fisioterapeutas nem especialistas de biomecânica; não detectam erros de postura e não substituem instrutor presencial. A amplitude deve ser confortável, sem dor.

## Executar

- Portátil: `TreinaPro-v1.9-PORTATIL.html` (abre diretamente no navegador; não precisa de rede).
- GitHub Pages: publique o conteúdo da pasta na raiz do repositório. Service worker requer HTTPS; a versão portátil é independente.
- Regenerar portátil: `python make_portable.py`.
- Backup: em Configurações, exporte/import o JSON ao mudar de aparelho ou origem do site.

## Referências

- [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/), referência de instruções de execução (sem copiar imagens ou vídeos).
- [ACE leg press](https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/).
- [MDN — Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
