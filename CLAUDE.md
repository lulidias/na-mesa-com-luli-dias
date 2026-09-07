# lulidias.com — guia de restaurantes e hotéis

Guia pessoal do Luli: **1.326 estabelecimentos** (1.098 restaurantes, 187 hotéis, 27 mercados) em 42 países e 220 cidades. Site **estático puro** — nenhum build, nenhum framework. Cada país é um HTML que carrega os seus dados de um array no próprio ficheiro.

**O nome é "Luli Dias" ou "lulidias.com".** Nunca "Na Mesa com Luli Dias" — nome abandonado.

**Independência:** a formulação correta é "nenhum lugar paga para estar no guia". Nunca escrever que as contas saíram do bolso do Luli — a empresa pagou a maioria e houve convites de produtores.

## Repo certo (erro que já custou trabalho perdido)

Este ficheiro está no repo **canónico**, no iCloud. Existe um clone velho em `~/na-mesa-preview` que serve o preview local e **está desatualizado** — editar lá não vai a lado nenhum.

## Publicar

`git push` para `main` **é** o deploy: o Cloudflare Pages republica em ~1 min. Domínio no `CNAME` (`lulidias.com`).

Regra do Luli: **toda mudança termina em commit + push na hora.** Nada fica só local.

Quando algo publicado não aparece, a ordem de suspeita é:
1. `git status fotos/` — ficheiros novos costumam ficar untracked;
2. cache do Cloudflare — ele guarda o 404 anterior; fazer **Purge Everything**;
3. o **limite de 1 GB** do Pages — o repo tem 5,6 GB no total, com 564 MB só em `fotos/`. Se o site parar de atualizar, medir o tamanho antes de procurar bug no código.

## Como os dados são guardados

Cada `<pais>-guia.html` (e os cinco `brasil-*.html`) tem, perto do fim:

```js
const FOLDER='portugal';          // pasta em fotos/
const PHOTOS={"a-gina": 2, ...};  // slug → nº de fotos
const CITIES=[
  {city:'Lisboa', region:'Lisboa', entries:[
    {n:'Nome', q:'Cozinha', a:'Morada', p:'+351...', pr:3, w:'site.pt',
     ig:'instagram_handle', note:'Nota curta', d:'Descrição PT',
     df:'FR', de:'EN', des:'ES', dit:'IT', dde:'DE'},
  ]},
];
```

Campos: `n` nome · `q` cozinha · `a` morada · `p` telefone · `pr` faixa de preço · `w` website · `ig` Instagram · `note` nota curta · `sel` selo de rede de luxo (LHW, SLH, Relais & Châteaux, Preferred, Design) · `d/df/de/des/dit/dde` descrição nas seis línguas.

**Regra de língua: língua nova = tudo traduzido.** Sem fallback para inglês. ES, IT e DE ainda têm dívida — a UI está traduzida, várias descrições não.

### A armadilha das vírgulas duplas

As entradas do `CITIES` **já terminam com vírgula**. Inserir uma nova antes do `]` produz `,,`, que cria um buraco no array e rebenta o render (`[...entries]` devolve `undefined`).

Depois de qualquer inserção: colapsar `,,` → `,` e validar com **`Array.from`** — `forEach` salta buracos e mente que está tudo bem.

## Estrutura

- `*-guia.html` — 42 países + `brasil-*.html` por região. `brasil-index.html` é o índice.
- `js/logo.js` — **a logo canónica**, SVG vetorial (subtítulo na mesma serifada e com a mesma largura do nome). Nunca recriar a marca em texto com Georgia+Arial — essa é a versão antiga e errada.
- `js/marks.js` — selos Michelin/chaves, partilha (`__ldShare`), metadados de cada guia.
- `js/auth.js` — sessão do assinante.
- `fotos/<pais>/<slug>-N.jpeg` — fotos, com `PHOTOS` a dizer quantas há.
- `admin/` — painel + `worker.js` (Cloudflare Worker `luli-admin`): `/enrich` (Claude API), `/publish` (commit no GitHub), `/register` (cadastro), D1 `lulidias-db`, Stripe, cron diário 09:00 UTC que sincroniza Mailchimp → D1. **O D1 é a fonte de verdade dos inscritos**, não o Mailchimp.
- `confras/` — Confra das Confras 2026 (RSVP, votação, telão, placas), sobre Supabase `confras_*`.
- `tito/` — os 13 estabelecimentos `c:"tito"` **não pertencem a este guia**; são do Tito Dias e vão sair para um guia próprio.
- `scripts/` — `build-counts.js`, `sync-stats-bars.js`, `generate-search.js`, `novo-pais.sh`.
- `supabase/migrations/` — SQL do Confras.

## Automações no GitHub Actions

- `build-counts.yml` — a cada push que toque num guia, regenera `counts.json`, sincroniza as stats-bars e dá commit sozinho. **Não editar `counts.json` à mão.**
- `cleanup-fotos.yml` — limpeza diária das fotos (04:00 UTC).
- `purge-cache.yml`, `download-covers.yml`, `update-cover.yml`.

## Fotos

Conversão por duplo-clique: `converter-fotos.command` (DNG/HEIC → JPEG, máx 1200px, q72) e os `converter-heic*.command`.

**Fotos deitadas:** otimizar com mozjpeg apaga a tag EXIF Orientation e as verticais tombam. **Auto-orientar antes de limpar o EXIF.** As 858 já corrigidas foram giradas sem perda com `jpegtran`.

Pasta de país nova: `bash scripts/novo-pais.sh <pasta>` — cria em `fotos/` e junta ao sparse-checkout.

## Ao adicionar um estabelecimento

Pesquisar e preencher **tudo na hora**, sem esperar que o Luli peça: morada, telefone, website, Instagram e descrição. Entrada sem isso é entrada incompleta. O comando `/guia` já faz este percurso.
