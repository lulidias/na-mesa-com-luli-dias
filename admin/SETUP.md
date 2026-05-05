# Admin Setup — Cloudflare Worker

Guia passo-a-passo para ativar a página `/admin/` com auto-completar e publicação automática.

**Tempo estimado:** 30-45 minutos. **Custo:** grátis (Cloudflare free tier) + ~$1-3/mês de uso da Claude API.

---

## Passo 1 — Criar conta Cloudflare (5 min)

1. Vai a https://dash.cloudflare.com/sign-up
2. Cria conta com `lulidias@me.com` (grátis)
3. Confirma o email

✅ **Resultado:** Tens conta Cloudflare. Não precisas adicionar domínio (lulidias.com fica no GitHub Pages).

---

## Passo 2 — Criar Personal Access Token do GitHub (5 min)

1. Vai a https://github.com/settings/tokens?type=beta
2. Clica em **Generate new token** → **Fine-grained token**
3. Configura:
   - **Token name:** `luli-admin-worker`
   - **Expiration:** 1 ano
   - **Repository access:** `Only select repositories` → escolhe `na-mesa-com-luli-dias`
   - **Repository permissions:**
     - **Contents:** `Read and write` ← OBRIGATÓRIO
     - **Metadata:** `Read-only` (default)
4. Clica em **Generate token**
5. **COPIA O TOKEN** (começa com `github_pat_...`) — só aparece uma vez!
6. Guarda-o num sitio seguro temporariamente (vai ser inserido no Cloudflare)

✅ **Resultado:** Tens o token GitHub para o Worker fazer commits.

---

## Passo 3 — Conseguir API key da Anthropic (3 min)

Se já tens uma chave Anthropic, pula este passo.

1. Vai a https://console.anthropic.com/settings/keys
2. Faz login (cria conta se necessário, podes usar Google)
3. Adiciona créditos (mínimo $5 — vai durar muitos meses)
4. Clica em **Create Key**
5. Nome: `luli-admin`
6. Copia a chave (começa com `sk-ant-api03-...`)

✅ **Resultado:** Tens a chave da Claude API.

---

## Passo 4 — Decidir uma chave de admin partilhada (1 min)

Esta é uma password que tu e o Tito vão saber. É o que protege o Worker de uso por estranhos.

Sugestão: gera uma string aleatória, ex: `LuliTitoCurador2026!XYZ` ou usa um gerador de password.

**Anota num sitio seguro** — vais precisar 2 vezes (no Worker E na página admin).

---

## Passo 5 — Criar o Worker no Cloudflare (10 min)

### Via Dashboard (mais fácil — recomendo):

1. No Cloudflare dashboard, **Workers & Pages** → **Create application** → **Create Worker**
2. Nome: `luli-admin`
3. Clica em **Deploy** (deploya o "Hello World" inicial)
4. Depois clica em **Edit code**
5. **Apaga TODO o código existente**
6. Cola o conteúdo de `admin/worker.js` deste repo:
   - https://github.com/lulidias/na-mesa-com-luli-dias/blob/main/admin/worker.js
   - Botão "Copy raw file" → cola no editor do Cloudflare
7. Clica em **Save and deploy** (canto superior direito)

✅ **Resultado:** O Worker existe num URL tipo `https://luli-admin.SEU-USERNAME.workers.dev`. **Anota este URL.**

### Configurar variáveis e secrets:

8. Volta ao Worker (Workers & Pages → luli-admin)
9. **Settings** → **Variables and Secrets**
10. Adiciona estas variáveis (clica em **Add variable** para cada):

| Nome | Tipo | Valor |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Secret** | a chave do Passo 3 (`sk-ant-api03-...`) |
| `GITHUB_TOKEN` | **Secret** | o token do Passo 2 (`github_pat_...`) |
| `GITHUB_OWNER` | Plaintext | `lulidias` |
| `GITHUB_REPO` | Plaintext | `na-mesa-com-luli-dias` |
| `ADMIN_KEY` | **Secret** | a password do Passo 4 |

⚠️ **Importante:** marca como **Secret** (não Plaintext) para `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` e `ADMIN_KEY`. Os Plaintext são visíveis no dashboard, os Secrets são encriptados.

11. Clica em **Save and deploy** novamente para aplicar

✅ **Resultado:** Worker tem acesso à Claude API e ao GitHub repo, e está protegido por chave.

---

## Passo 6 — Testar o Worker (2 min)

No browser ou terminal, testa que está vivo:

```bash
# substitui o URL abaixo pelo do teu Worker
curl https://luli-admin.SEU-USERNAME.workers.dev/health
```

Resposta esperada:
```json
{"error":"unauthorized"}
```

(Sim, isto é o sucesso — significa que o Worker está vivo e a pedir autenticação. Mostra que o `ADMIN_KEY` está a funcionar.)

Para testar com auth:
```bash
curl https://luli-admin.SEU-USERNAME.workers.dev/health \
  -H "X-Admin-Key: A_SUA_PASSWORD_DO_PASSO_4"
```

Resposta esperada: `{"ok":true,"version":"1.0"}`

---

## Passo 7 — Configurar a página Admin (1 min)

1. Abre `https://lulidias.com/admin/` (ou `https://lulidias.github.io/na-mesa-com-luli-dias/admin/`)
2. Faz login como Luli
3. Vai à tab **Configurações**
4. Preenche:
   - **URL do Worker:** `https://luli-admin.SEU-USERNAME.workers.dev`
   - **Chave de acesso:** a password do Passo 4
5. Clica em **Guardar**

✅ **Resultado:** A página admin está conectada ao Worker.

---

## Passo 8 — Primeiro teste end-to-end (3 min)

1. Tab **Novo**
2. Tipo: Restaurante
3. Nome: `Casa do Bacalhau`
4. Cidade: `Lisboa`
5. País: `Portugal`
6. Clica em **🪄 Buscar info automaticamente**
7. Espera ~10 segundos — o form deve preencher sozinho com endereço, telefone, etc.
8. (Opcional) Adiciona 1-2 fotos
9. Clica em **Publicar**
10. Vai ao GitHub Desktop e vê: deve aparecer um commit novo "Admin: +Casa do Bacalhau · Lisboa"

✅ **Se funcionou:** Tudo OK! O sistema está pronto.

❌ **Se falhar:**
- Verifica o erro no toast (canto inferior). Se for "unauthorized" → chave errada nas Configurações.
- Se for erro 500 → vai ao Cloudflare Dashboard → Workers → luli-admin → **Logs** para ver o erro real.

---

## Passo 9 — Dar acesso ao Tito (2 min)

1. Manda ao Tito por mensagem:
   - URL: `https://lulidias.com/admin/?user=tito`
   - Worker URL: o do Passo 5
   - Admin Key: a password do Passo 4
2. Tito abre o URL no Safari do iPhone
3. Adiciona à tela inicial: Safari → Partilhar → **Adicionar ao Ecrã Inicial**
4. Vai a **Configurações** uma vez e cola o URL do Worker + a chave (ficam guardados no browser dele)
5. ✅ Done — agora pode adicionar restaurantes do telemóvel.

---

## Custos (resumo)

| Serviço | Free tier | Custo realista |
|---|---|---|
| Cloudflare Workers | 100,000 requests/dia | $0 (estamos longe) |
| Cloudflare Pages | ilimitado | $0 |
| GitHub Pages | ilimitado | $0 |
| Anthropic Claude API | $5 inicial | ~$0.02 por restaurante = **$1-3/mês** com uso intensivo |

**Total: ~$1-3/mês.**

---

## Troubleshooting

**Erro "unauthorized" ao buscar info:**
→ A chave nas Configurações do admin não bate com a `ADMIN_KEY` no Worker. Re-confere ambas.

**Erro 500 / fail to fetch guide:**
→ O `GITHUB_TOKEN` não tem permissão Contents:write. Vai ao GitHub Settings → Tokens → ver permissões.

**Erro "anthropic api error":**
→ Sem créditos na Anthropic, ou chave inválida. Vai a console.anthropic.com → Billing.

**Foto não aparece:**
→ Cloudflare Worker tem timeout de 30s. Se foto >5MB pode timeout. Reduz tamanho antes.

**Página admin diz "Backend não configurado":**
→ Vai a **Configurações** e preenche os campos.

---

## Próximos passos (Fase 3+)

Quando isto estiver a funcionar, podemos adicionar:

1. **Apple Shortcut iOS** — botão na tela inicial do iPhone que tira foto + GPS + chama o Worker. Setup: 30 min.
2. **Telegram Bot** — bot que recebe foto + localização + texto e chama o Worker. Setup: 30 min.
3. **WhatsApp Business API** — quando estiveres pronta. Setup: 2-3h + verificação Meta.
4. **HEIC → JPEG automático** — atualmente o Worker não converte HEIC. Pode adicionar com um Worker auxiliar.
5. **Editar/Apagar entries** — atualmente só adiciona. Editar via tab "Editar Existente" ainda não publica edits.

---

**Dúvidas?** Mostra-me a mensagem de erro e eu ajudo a debugar.
