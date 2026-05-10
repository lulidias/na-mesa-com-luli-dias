# CRM Setup — Fase 0

Setup das 3 ferramentas externas que vão suportar o CRM. Faz na ordem indicada.

---

## 1. Cloudflare D1 (database)

**O que é:** SQL grátis até 5GB no edge da Cloudflare. Vai guardar subscribers, events, founder codes.

**Comandos** (corre no terminal, dentro da pasta `admin/`):

```bash
cd admin

# Criar a base de dados
wrangler d1 create lulidias-db
```

Vai retornar algo como:

```
✅ Successfully created DB 'lulidias-db' in region EEUR
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "lulidias-db"
database_id = "abc12345-de67-..."
```

**Copia o bloco `[[d1_databases]]` que aparece** e cola-mo de volta. Eu adiciono ao `wrangler.toml`.

Depois de eu adicionar:

```bash
# Aplicar o schema
wrangler d1 execute lulidias-db --remote --file=db/schema.sql

# Verificar que ficou OK
wrangler d1 execute lulidias-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Devia mostrar 5 tabelas: `subscribers`, `events`, `founder_codes`, `magic_links`, `sessions`.

---

## 2. Stripe (payments)

**O que é:** processador de pagamentos. Trata de cartões, recibos, customer portal (cancelar/atualizar cartão), webhooks.

### 2.1. Criar conta

1. Vai a https://dashboard.stripe.com/register
2. Preenche email + password
3. País de residência: **Portugal** (ou onde tens residência fiscal)
4. Tipo de negócio: **Sole proprietorship / Particular** (mais simples; podes mudar para empresa depois)
5. Atividade: "Digital products / subscriptions"
6. Vai-te pedir IBAN (para receber payouts) e dados fiscais (NIF). Podes preencher depois — começa em **modo de teste** primeiro.

### 2.2. Configurar produtos (ainda em modo de teste)

No dashboard Stripe → **Products** → **+ Add product**:

**Produto 1: "Luli Dias — Annual Subscription"**
- Name: `Luli Dias — Annual Subscription`
- Description: `Full access to all 37 country guides — 800+ curated restaurants and hotels`
- Pricing model: **Recurring**
- Price: **€50.00 / year**
- Currency: **EUR**
- Trial period: **7 days** (no próprio Stripe)
- Save → copia o **Price ID** (começa por `price_...`) e cola-mo

**Produto 2: "Luli Dias — Founder Annual"**
- Name: `Luli Dias — Founder Annual`
- Pricing model: **Recurring**
- Price: **€35.00 / year**
- Currency: **EUR**
- Trial period: **none**
- Save → copia o **Price ID**

**Produto 3: "Luli Dias — Founder Lifetime"**
- Name: `Luli Dias — Founder Lifetime`
- Pricing model: **One time**
- Price: **€200.00**
- Currency: **EUR**
- Save → copia o **Price ID**

### 2.3. Recolher chaves

No dashboard → **Developers** → **API keys**:
- Copia **Publishable key** (`pk_test_...`)
- Copia **Secret key** (`sk_test_...`)

Webhook secret: vamos criar quando o Worker estiver pronto, deixa para depois.

### 2.4. Resumo do que mandar de volta

```
PRICE_ID_ANNUAL=price_...
PRICE_ID_FOUNDER_ANNUAL=price_...
PRICE_ID_FOUNDER_LIFETIME=price_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## 3. Resend (email)

**O que é:** API de email. Faz transacional (welcome, recibo) e newsletter (broadcasts). Free 3k emails/mês.

### 3.1. Criar conta

1. Vai a https://resend.com/signup
2. Sign up com Google ou email
3. No primeiro login, pede para verificares o email

### 3.2. Adicionar e verificar domínio

1. Dashboard → **Domains** → **Add Domain**
2. Insere: `lulidias.com`
3. Resend mostra-te 3-4 registos DNS para adicionares no Cloudflare (TXT, CNAME, MX). Tipicamente:
   - SPF: `TXT @ "v=spf1 include:_spf.resend.com ~all"`
   - DKIM: 2-3 CNAMEs
   - MX: opcional (só se quiseres receber)
4. Vai a **Cloudflare Dashboard** → **lulidias.com** → **DNS** → adiciona cada registo conforme Resend indica
5. Volta ao Resend e clica **Verify** — pode demorar 5 a 30 min

### 3.3. Recolher chave API

No Resend → **API Keys** → **+ Create API Key**:
- Name: `lulidias-worker`
- Permission: **Full access** (precisamos de Audiences API também)
- Domain: `lulidias.com`
- Copia a chave (começa por `re_...`) — só aparece uma vez!

### 3.4. Resumo do que mandar de volta

```
RESEND_API_KEY=re_...
RESEND_DOMAIN_VERIFIED=yes/no  (só me confirmas que ficou verificado)
```

---

## Checklist final

- [ ] D1 criado e schema aplicado → mando bloco `[[d1_databases]]`
- [ ] Stripe conta criada (modo teste OK por agora)
- [ ] Stripe 3 produtos criados → mando 3 Price IDs + 2 chaves
- [ ] Resend conta criada
- [ ] Resend domínio `lulidias.com` verificado → mando API key

Quando tiveres tudo (ou parte), cola-me aqui:

```
[[d1_databases]]
binding = "DB"
database_name = "lulidias-db"
database_id = "..."

PRICE_ID_ANNUAL=price_...
PRICE_ID_FOUNDER_ANNUAL=price_...
PRICE_ID_FOUNDER_LIFETIME=price_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

RESEND_API_KEY=re_...
```

**Nota de segurança:** as chaves `sk_test_...` e `re_...` são secretas. Eu vou usá-las para correr `wrangler secret put` — não ficam no Git.
