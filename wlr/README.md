# Magnum Fest Licínio Dias 2026 — Wine Lovers Recife

Site da festa da Wine Lovers Recife (11/12/2026, Restaurante Ruizito, Shopping RioMar). Clone do `confras/` com a marca da WLR e a análise dos vinhos pelos critérios da MFLD.

- `index.html`: página pública (RSVP só para os membros da lista, painel do confrade, carta com o parecer de cada vinho, números, votação).
- `admin.html`: painel do conselho. Cada conselheiro entra com o próprio link (`admin.html?t=<token>`), e as decisões ficam registradas com o nome dele. O organizador vê também os links do conselho e os acessos.
- `votar/`, `telao.html`, `telao2/`: urna e telões da noite. `cartao.html` e `premio.html` geram as imagens para o WhatsApp. `placa-print.html` é a placa de 15×20 cm.
- Backend: Supabase `saotncritqxuchsvvnzi`, tabelas `wlr_*` (migrações `supabase/migrations/20260925*_wlr*.sql`) e a edge function `wlr-worker` (e-mails, fotos do Vivino e análise dos critérios com a Claude API; as regras ficam em `criterios.ts`).

## Domínio próprio: wineloversrecife.com (26/09/2026)

- Projeto Cloudflare Pages **`wineloversrecife`**, do mesmo repo, com **saída `wlr`** (publica só esta pasta) e os domínios `wineloversrecife.com` e `www.wineloversrecife.com`. Cada push em `main` atualiza os dois endereços.
- `wlr_config.site_url = https://wineloversrecife.com/` (links dos e-mails).
- Quem abre `lulidias.com/wlr/...` é levado por script para `wineloversrecife.com/...`, com o mesmo caminho, `?id=` e `?t=`.
- O Pages serve `admin.html` como `/admin` (redireciona sozinho, mantendo o `?t=`).
- O domínio foi comprado na Cloudflare (conta do Luli). Para passar à confraria: transferir entre contas Cloudflare.
