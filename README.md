# TreinaPro v2.0 — REV4 (instalação e offline no celular)

- Sem 3D: 29 exercícios, demonstrações 2D, programas ABC e inferiores/superiores preservados.
- Instalação opcional nas Configurações: Android/Chrome oferece o prompt quando disponível; Safari no iPhone/iPad pede Compartilhar > Adicionar à Tela de Início.
- Service worker armazena primeiro 13 recursos indispensáveis. A opção "Salvar exercícios para uso offline" guarda mais 174 arquivos de imagens/animações em quatro downloads simultâneos.
- O pacote offline pode ser repetido após uma falha; caches anteriores são migrados antes de serem removidos.
- Nova revisão não recarrega automaticamente um treino em andamento.
- Fonte do sistema: sem solicitação de fonte a outro domínio.
- IndexedDB, localStorage (`treinapro-personal-v1`), registros, perfil, calendário, backups e descanso mantidos.
- O gerador `python make_portable.py` produz o HTML único para uso sem rede. Instalação PWA é apenas via site HTTPS.

Orientações visuais educativas: não analisam postura nem substituem personal presencial. Faça backup do histórico; o navegador pode limpar caches/dados.

Referências: https://web.dev/learn/pwa/installation e https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
