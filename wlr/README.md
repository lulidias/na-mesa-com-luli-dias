# Magnum Fest Licínio Dias 2026 — Wine Lovers Recife

Site da festa da Wine Lovers Recife (11/12/2026, Restaurante Ruizito, Shopping RioMar). Clone do `confras/` com a marca da WLR e a análise dos vinhos pelos critérios da MFLD.

- `index.html`: página pública (RSVP só para os membros da lista, painel do confrade, carta com o parecer de cada vinho, números, votação).
- `admin.html`: painel do conselho. Cada conselheiro entra com o próprio link (`admin.html?t=<token>`), e as decisões ficam registradas com o nome dele. O organizador vê também os links do conselho e os acessos.
- `votar/`, `telao.html`, `telao2/`: urna e telões da noite. `cartao.html` e `premio.html` geram as imagens para o WhatsApp. `placa-print.html` é a placa de 15×20 cm.
- Backend: Supabase `saotncritqxuchsvvnzi`, tabelas `wlr_*` (migrações `supabase/migrations/20260925*_wlr*.sql`) e a edge function `wlr-worker` (e-mails, fotos do Vivino e análise dos critérios com a Claude API; as regras ficam em `criterios.ts`).

## Mudar para wineloversrecife.com.br

Todos os links do site são relativos: a pasta funciona tanto em `lulidias.com/wlr/` quanto na raiz de outro domínio. Quando o domínio estiver registrado:

1. No Cloudflare, criar um projeto Pages novo a partir deste mesmo repo, com **diretório de saída `wlr`**, e ligar o domínio `wineloversrecife.com.br` a ele.
2. Em produção: `update wlr_config set site_url = 'https://wineloversrecife.com.br/'` (é o endereço usado nos links dos e-mails).
3. Trocar `og:url` e `og:image` no `<head>` do `index.html` para o domínio novo.
4. Em `lulidias.com`, redirecionar `/wlr/*` para o domínio novo (regra de redirect no Cloudflare), para os links antigos continuarem valendo.
