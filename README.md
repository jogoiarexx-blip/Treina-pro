# TreinaPro v2.0 — REV1: confiabilidade do histórico

Evolução sobre a versão 1.9.1 exclusivamente 2D. Programas ABC, pernas/superiores, 29 exercícios, calendário, personal por voz e perfil preservados.

- Armazenamento redundante no IndexedDB e na chave histórica localStorage `treinapro-personal-v1`.
- Migração da cópia antiga; restauração da versão mais recente caso o armazenamento principal esteja vazio ou desatualizado.
- Datas corrigidas com chave YYYY-MM-DD no horário local do dispositivo.
- Cronômetro de treino Iniciar/Pausar/Retomar, com pausa ao sair da página. Novas sessões guardam tempo efetivo medido.
- Os históricos antigos mantêm indicação de tempo estimado; nenhum valor foi convertido artificialmente.
- Cache offline atualizado para incluir storage.js.
- Aplicativo portátil: `TreinaPro-v2.0-REV1-PORTATIL.html` (gerado com `python make_portable.py`).

Não apague os dados do site ao atualizar. Mesmo duas cópias locais podem ser perdidas se o navegador limpar seu armazenamento; exporte o backup JSON antes de trocar de aparelho.
