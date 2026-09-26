// Magnum Fest Licínio Dias 2026 (Wine Lovers Recife) — worker:
// fila de e-mails (modelos editáveis, ver emails.ts), fotos das garrafas e ANÁLISE DOS VINHOS pelos critérios da MFLD.
// Secrets: WLR_CRON_SECRET, ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM (+ SUPABASE_* automáticos)
// Deploy: supabase functions deploy wlr-worker --no-verify-jwt --project-ref saotncritqxuchsvvnzi

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { avaliar, BRANCO_REGIOES_VELHO_MUNDO, type Fatos } from "./criterios.ts";
import { carregaCtx, carregaModelos, destinatarios, enfileira, exemplo, monta, processaFila as filaEmails } from "./emails.ts";

const SECRET = Deno.env.get("WLR_CRON_SECRET") ?? "";
const MODELO = "claude-opus-5";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Cfg = Record<string, any>;

async function carregaCfg(): Promise<Cfg> {
  const { data } = await sb.from("wlr_config").select("*").eq("id", 1).single();
  return data ?? {};
}

// ── fotos (Vivino, garrafa inteira _pb_) ──────────────────────────────────
async function buscaFotos() {
  const { data: gs } = await sb.from("wlr_garrafas").select("id, vinho, safra, produtor").is("foto_url", null).limit(6);
  let achadas = 0;
  for (const g of gs ?? []) {
    let url: string | null = null;
    try {
      const q = encodeURIComponent([g.produtor, g.vinho, g.safra].filter(Boolean).join(" "));
      const r = await fetch(`https://www.vivino.com/search/wines?q=${q}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      if (r.ok) {
        const m = (await r.text()).match(/\/\/images\.vivino\.com\/thumbs\/[A-Za-z0-9_-]+_p[bl]_[0-9a-zA-Zx]+\.(?:png|jpe?g)/);
        if (m) url = "https:" + m[0].replace(/_pl_[0-9a-zA-Zx]+\./, "_pb_x600.");
      }
    } catch (_) { /* melhor esforço */ }
    await sb.from("wlr_garrafas").update({ foto_url: url ?? "" }).eq("id", g.id);
    if (url) achadas++;
    await new Promise((r) => setTimeout(r, 800));
  }
  return { tentadas: (gs ?? []).length, achadas };
}

// ── análise dos critérios ─────────────────────────────────────────────────
const CATEGORIAS = ["Tinto", "Branco", "Rosé", "Champagne", "Cava", "Prosecco", "Espumante brasileiro", "Outro espumante",
  "Porto Vintage", "Porto Tawny", "Outro Porto", "Sauternes", "Tokaj", "Outro doce/fortificado"];
const num = { type: ["number", "null"] };
const str = { type: ["string", "null"] };
const FERRAMENTA: Anthropic.Beta.BetaTool = {
  name: "registrar_fatos",
  description: "Registra os fatos apurados sobre o vinho. Chame uma única vez, ao final da pesquisa.",
  // sem "strict": o formulário tem mais campos opcionais (18) do que o modo estrito aceita (16)
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["identificado", "nome_completo", "produtor", "regiao", "pais", "categoria", "estilo_espumante", "safra",
      "tawny_idade", "puttonyos", "regiao_branco_lista", "nota_rp", "nota_ws", "nota_js", "fontes_notas",
      "preco_eur_750", "preco_eur_formato", "fonte_preco", "premiado", "premios", "origem_controlada", "confianca", "observacoes", "observacoes_es", "observacoes_en"],
    properties: {
      identificado: { type: "boolean", description: "true se encontrou este vinho específico (produtor + rótulo + safra)" },
      nome_completo: { type: "string" },
      produtor: str, regiao: str,
      pais: { type: ["string", "null"], description: "Nome do país em português (França, Itália, Estados Unidos…)" },
      categoria: { type: "string", enum: CATEGORIAS },
      estilo_espumante: { anyOf: [{ type: "string", enum: ["Brut", "Rosé", "Outro"] }, { type: "null" }], description: "Só para espumantes" },
      safra: { type: ["integer", "null"] },
      tawny_idade: { type: ["integer", "null"], description: "Idade indicada no rótulo de um Porto Tawny (10, 20, 30, 40)" },
      puttonyos: { type: ["integer", "null"] },
      regiao_branco_lista: { anyOf: [{ type: "string", enum: [...BRANCO_REGIOES_VELHO_MUNDO] }, { type: "null" }],
        description: "Para brancos do Velho Mundo: a região da lista a que o vinho pertence; null se não pertence ou se não é branco" },
      nota_rp: { ...num, description: "Nota de Robert Parker / Wine Advocate para ESTA safra" },
      nota_ws: { ...num, description: "Nota da Wine Spectator para ESTA safra" },
      nota_js: { ...num, description: "Nota de James Suckling para ESTA safra" },
      fontes_notas: str,
      preco_eur_750: { ...num, description: "Preço médio no Wine-Searcher, em euros, garrafa de 750 ml, ESTA safra" },
      preco_eur_formato: { ...num, description: "Preço médio no Wine-Searcher no formato levado (ex.: Magnum), se houver" },
      fonte_preco: str,
      premiado: { type: ["boolean", "null"], description: "Para Cava, Prosecco e espumante brasileiro: tem medalhas/prêmios relevantes?" },
      premios: str,
      origem_controlada: { type: ["boolean", "null"], description: "Para espumantes fora de Champagne: tem DO/DOC/DOCG/IG?" },
      confianca: { type: "string", enum: ["alta", "media", "baixa"] },
      observacoes: { type: "string", description: "Uma ou duas frases em português com o que for relevante para o conselho" },
      observacoes_es: { type: "string", description: "As mesmas observações, em espanhol" },
      observacoes_en: { type: "string", description: "As mesmas observações, em inglês" },
    },
  },
};

const SISTEMA = `Você apura fatos sobre vinhos para a Magnum Fest Licínio Dias, festa da confraria Wine Lovers Recife.
Para cada vinho, pesquise na web:
- as notas de Robert Parker (Wine Advocate), Wine Spectator e James Suckling PARA A SAFRA INFORMADA — nunca use a nota de outra safra;
- o preço médio no Wine-Searcher em euros (garrafa de 750 ml e, se houver, o formato levado);
- região, país e categoria corretos; para brancos, se a região está entre: ${BRANCO_REGIOES_VELHO_MUNDO.join(", ")};
- para espumantes fora de Champagne: se é safrado, premiado e de origem controlada; para Porto e Tokaj: estilo, idade e puttonyos.
Quando não encontrar um dado com segurança, deixe null — não estime. Não julgue se o vinho entra na festa: só registre os fatos.
Ao terminar, chame registrar_fatos uma única vez.`;

async function perguntaClaude(g: any, produtorDe: string | null): Promise<Fatos> {
  const client = new Anthropic();
  const pedido = `Vinho registrado por um confrade:
- Vinho: ${g.vinho}
- Produtor: ${g.produtor ?? "(não informado)"}
- Região: ${g.regiao ?? "(não informada)"} · País: ${g.pais ?? "(não informado)"}
- Safra: ${g.safra ?? "(não informada)"}
- Tipo informado: ${g.tipo}${g.subtipo ? " / " + g.subtipo : ""}
- Formato levado: ${g.formato} (${g.litros} L)
${produtorDe ? `- O confrade é produtor da vinícola "${produtorDe}".` : ""}`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: pedido }];
  for (let volta = 0; volta < 6; volta++) {
    const r = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: SISTEMA,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 } as any, FERRAMENTA],
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as any) as Anthropic.Beta.BetaMessage;
    if (r.stop_reason === "refusal") throw new Error("O modelo recusou a análise");
    const uso = r.content.find((b) => b.type === "tool_use" && b.name === "registrar_fatos") as Anthropic.Beta.BetaToolUseBlock | undefined;
    if (uso) return uso.input as Fatos;
    messages.push({ role: "assistant", content: r.content });
    // pause_turn: reenviar como está, sem mensagem nova; fim de turno sem a ferramenta: pedir o registro
    if (r.stop_reason !== "pause_turn") {
      messages.push({ role: "user", content: "Registre agora os fatos apurados com a ferramenta registrar_fatos." });
    }
  }
  throw new Error("A análise não chegou a um registro");
}

async function analisar(garrafaId: string, cfg: Cfg) {
  const { data: g } = await sb.from("wlr_garrafas").select("*").eq("id", garrafaId).single();
  if (!g || g.analise_status === "processando") return { pulada: true };
  await sb.from("wlr_garrafas").update({ analise_status: "processando", analise_em: new Date().toISOString(),
    analise_tentativas: (g.analise_tentativas ?? 0) + 1 }).eq("id", g.id);
  try {
    const { data: dono } = g.criado_por
      ? await sb.from("wlr_participantes").select("nome, email, produtor_de").eq("id", g.criado_por).single()
      : { data: null };
    const fatos = await perguntaClaude(g, dono?.produtor_de ?? null);

    // vagas já ocupadas por espumantes e doces aprovados (sem contar esta garrafa)
    const { data: outras } = await sb.from("wlr_vinhos_publico").select("id, tipo, subtipo, situacao").eq("situacao", "aprovado").neq("id", g.id);
    const esp = (outras ?? []).filter((x) => x.tipo === "Espumante");
    const ctxAval = {
      ano_evento: new Date(cfg.evento_em).getFullYear(),
      litros: Number(g.litros),
      produtor_do_confrade: dono?.produtor_de ?? null,
      vagas: { espumantes: esp.length, espumante_rose: esp.filter((x) => x.subtipo === "Rosé").length,
        doces: (outras ?? []).filter((x) => x.tipo === "Fortificado / Doce").length },
      limites: { espumantes: cfg.lim_espumantes, espumante_rose: cfg.lim_espumante_rose, doces: cfg.lim_doces },
    };
    const parecer = avaliar(fatos, ctxAval, "pt");
    const pEs = avaliar(fatos, ctxAval, "es"), pEn = avaliar(fatos, ctxAval, "en");
    parecer.publico = { ...parecer.publico, resumo_es: pEs.publico.resumo, resumo_en: pEn.publico.resumo } as typeof parecer.publico;
    const analise = { ...parecer, fatos, modelo: MODELO, em: new Date().toISOString(),
      i18n: { es: { resumo: pEs.resumo, criterios: pEs.criterios, observacoes: fatos.observacoes_es },
              en: { resumo: pEn.resumo, criterios: pEn.criterios, observacoes: fatos.observacoes_en } },
      motivo_excecao: g.analise?.motivo_excecao ?? null };
    await sb.from("wlr_garrafas").update({ analise_status: parecer.status, analise, requer_conselho: parecer.requer_conselho,
      analise_em: new Date().toISOString() }).eq("id", g.id);

    // já decidido pelo conselho (ex.: lista importada) → só registra, sem e-mails
    if (!g.decisao) {
      const situacao = parecer.status === "inapto" ? "inapto" : parecer.requer_conselho ? "em_analise" : "aprovado";
      // reprovado: o confrade NÃO é avisado agora — o conselho decide primeiro (pedido do Luli, 27/09)
      if (dono?.email && situacao !== "inapto") {
        await sb.rpc("wlr_email_enqueue", { p_tipo: "parecer", p_para: dono.email, p_dados: {
          nome: dono.nome, participante_id: g.criado_por, garrafa_id: g.id, vinho: g.vinho, safra: g.safra,
          situacao, resumo: parecer.resumo, criterios: parecer.criterios,
          resumo_i18n: { es: pEs.resumo, en: pEn.resumo }, criterios_i18n: { es: pEs.criterios, en: pEn.criterios } } });
      }
      if (situacao === "em_analise" || situacao === "inapto") {
        const { data: conselho } = await sb.from("wlr_conselho").select("nome, email, token").not("email", "is", null);
        for (const c of conselho ?? []) {
          await sb.rpc("wlr_email_enqueue", { p_tipo: "conselho-avaliar", p_para: c.email, p_dados: {
            conselheiro: c.nome, token: c.token, garrafa_id: g.id, vinho: g.vinho, safra: g.safra,
            nome: c.nome, confrade: dono?.nome ?? g.sigla ?? "—", criterios: parecer.criterios, idioma: "pt",
            resumo: situacao === "inapto"
              ? "Reprovada na análise automática — " + parecer.resumo + " O confrade ainda não foi avisado: a decisão é do conselho."
              : parecer.resumo } });
        }
      }
    }
    return { garrafa: g.id, status: parecer.status };
  } catch (e) {
    const tent = (g.analise_tentativas ?? 0) + 1;
    await sb.from("wlr_garrafas").update({
      analise_status: tent >= 3 ? "erro" : "pendente",
      requer_conselho: tent >= 3 ? true : g.requer_conselho,
      analise: { ...(g.analise ?? {}), erro: String(e).slice(0, 400) },
    }).eq("id", g.id);
    return { garrafa: g.id, erro: String(e) };
  }
}

// garrafas presas em "processando" (timeout do runtime) voltam para a fila
async function destrava() {
  const limite = new Date(Date.now() - 10 * 60e3).toISOString();
  await sb.from("wlr_garrafas").update({ analise_status: "pendente" }).eq("analise_status", "processando").lt("analise_em", limite);
}
async function proximaPendente() {
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return undefined;   // sem a chave, as garrafas esperam na fila
  const { data } = await sb.from("wlr_garrafas").select("id").eq("analise_status", "pendente").order("criado_em").limit(1);
  return data?.[0]?.id as string | undefined;
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const processaFila = (cfg: Cfg) => filaEmails(sb, cfg);

// campanha agendada: respeita o "ativo" do modelo e o público dele
async function campanha(tipo: string, cfg: Cfg) {
  const modelos = await carregaModelos(sb);
  const m = modelos[tipo];
  if (!m || !m.ativo) return { tipo, pulado: "desligado" };
  if (tipo === "resumo") {
    // a cada 15 dias: só nas semanas pares do ano
    const d = new Date(); const ini = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const semana = Math.ceil(((d.getTime() - ini.getTime()) / 864e5 + ini.getUTCDay() + 1) / 7);
    if (semana % 2 === 1) return { tipo, pulado: "semana ímpar" };
  }
  const n = await enfileira(sb, tipo, await destinatarios(sb, m.publico));
  return { tipo, enfileirados: n, fila: await processaFila(cfg) };
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });

// chamadas do painel do conselho (token pessoal): pré-visualizar, contar e enviar
async function painel(body: any, cfg: Cfg) {
  const { data: quem, error } = await sb.rpc("wlr_admin_check", { p_token: body.t ?? "" });
  if (error || !quem) return json({ ok: false, erro: "Código inválido" }, 403);
  const modelos = await carregaModelos(sb);
  const m = modelos[body.tipo];
  if (!m) return json({ ok: false, erro: "Modelo não encontrado" }, 404);
  if (body.task === "preview") {
    const ctx = await carregaCtx(sb, cfg);
    const l = ["pt", "es", "en"].includes(body.lang) ? body.lang : "pt";
    return json({ ok: true, ...monta(m, body.tipo, exemplo(body.tipo, ctx), ctx, l, body.rascunho ?? undefined) });
  }
  const alvos = await destinatarios(sb, body.publico ?? m.publico, body.participante);
  if (body.task === "contar") return json({ ok: true, n: alvos.length, nomes: alvos.map((a) => a.dados.nome) });
  if (body.task === "enviar") {
    if (m.automatico && !["votacao-aberta", "resultados", "boas-vindas"].includes(body.tipo)) {
      return json({ ok: false, erro: "Este e-mail é disparado sozinho pelo sistema" }, 400);
    }
    const n = await enfileira(sb, body.tipo, alvos, { manual: true, enviado_por: quem });
    EdgeRuntime.waitUntil(processaFila(cfg));
    return json({ ok: true, n });
  }
  return json({ ok: false, erro: "Tarefa desconhecida" }, 400);
}

// ── álbum coletivo (bucket privado wlr-album) ─────────────────────────────
// O confrade (sessão = p_id) pede links de envio, sobe as fotos direto do navegador e registra; para ver, o worker
// devolve links temporários. Quem enviou apaga a própria foto; o conselho (token) apaga qualquer uma.
const ALBUM = "wlr-album";
async function sessaoOk(pid: string | undefined) {
  if (!pid || !/^[0-9a-f-]{36}$/i.test(pid)) return false;
  const { data } = await sb.rpc("wlr_sessao_ok", { p_id: pid });
  return data === true;
}
async function refOk(ref: string, cfg: Cfg) {
  const m = /^mf-(\d{4})$/.exec(ref);
  if (m) {
    const ano = +m[1];
    const atual = cfg.evento_em ? new Date(cfg.evento_em).getFullYear() : 0;
    if (ano === atual) return true;
    const { data } = await sb.from("wlr_edicoes").select("ano").eq("ano", ano).maybeSingle();
    return !!data;
  }
  const e = /^ev-([0-9a-f-]{36})$/i.exec(ref);
  if (e) { const { data } = await sb.from("wlr_eventos").select("id").eq("id", e[1]).maybeSingle(); return !!data; }
  return false;
}
async function album(body: any, cfg: Cfg) {
  const t = body.task;
  const admin = body.t ? await sb.rpc("wlr_admin_check", { p_token: body.t }).then((r) => r.error ? null : r.data) : null;
  if (!admin && !(await sessaoOk(body.p_id))) return json({ ok: false, erro: "Acesso restrito aos membros" }, 403);
  const ref = String(body.ref ?? "");

  if (t === "album-listar") {
    let q = sb.from("wlr_album").select("id, ref, path, thumb, autor_id, autor_nome, legenda, criado_em").order("criado_em", { ascending: true });
    q = ref ? q.eq("ref", ref) : q.order("criado_em", { ascending: false }).limit(120);
    const { data: fotos } = await q;
    const lista = fotos ?? [];
    if (!lista.length) return json({ ok: true, fotos: [] });
    const caminhos = lista.flatMap((f) => [f.thumb, f.path]);
    const { data: urls } = await sb.storage.from(ALBUM).createSignedUrls(caminhos, 3600);
    const u: Record<string, string> = {};
    (urls ?? []).forEach((x: any) => { if (x.path && x.signedUrl) u[x.path] = x.signedUrl; });
    return json({ ok: true, fotos: lista.map((f) => ({ id: f.id, ref: f.ref, autor: f.autor_nome, legenda: f.legenda, criado_em: f.criado_em,
      minha: !!body.p_id && f.autor_id === body.p_id, thumb: u[f.thumb], url: u[f.path] })) });
  }

  if (t === "album-enviar") {
    if (!(await refOk(ref, cfg))) return json({ ok: false, erro: "Evento não encontrado" }, 404);
    const n = Math.min(Math.max(parseInt(body.n, 10) || 1, 1), 30);
    const itens = [];
    for (let i = 0; i < n; i++) {
      const id = crypto.randomUUID();
      const path = `${ref}/${id}.jpg`, thumb = `${ref}/${id}_t.jpg`;
      const a = await sb.storage.from(ALBUM).createSignedUploadUrl(path);
      const b = await sb.storage.from(ALBUM).createSignedUploadUrl(thumb);
      if (a.error || b.error) return json({ ok: false, erro: "Não foi possível preparar o envio" }, 500);
      itens.push({ path, thumb, url: a.data.signedUrl, url_thumb: b.data.signedUrl });
    }
    return json({ ok: true, itens });
  }

  if (t === "album-registrar") {
    if (!(await refOk(ref, cfg))) return json({ ok: false, erro: "Evento não encontrado" }, 404);
    const itens = (Array.isArray(body.itens) ? body.itens : []).slice(0, 30)
      .filter((x: any) => typeof x.path === "string" && x.path.startsWith(ref + "/") && x.thumb === x.path.replace(/\.jpg$/, "_t.jpg"));
    // só registra o que de fato chegou ao armazenamento
    const { data: existe } = await sb.storage.from(ALBUM).list(ref, { limit: 1000 });
    const nomes = new Set((existe ?? []).map((o: any) => `${ref}/${o.name}`));
    const ok = itens.filter((x: any) => nomes.has(x.path) && nomes.has(x.thumb));
    let autor = admin as string | null;
    if (!admin) {
      const { data: c } = await sb.from("wlr_confrades").select("nome, apelido").eq("participante_id", body.p_id).maybeSingle();
      const { data: p } = await sb.from("wlr_participantes").select("nome").eq("id", body.p_id).maybeSingle();
      autor = c?.nome ?? p?.nome ?? "Confrade";
    }
    if (ok.length) {
      const { error } = await sb.from("wlr_album").insert(ok.map((x: any) => ({ ref, path: x.path, thumb: x.thumb,
        autor_id: admin ? null : body.p_id, autor_nome: autor, legenda: String(x.legenda ?? "").slice(0, 200) || null })));
      if (error) return json({ ok: false, erro: error.message }, 500);
    }
    return json({ ok: true, n: ok.length });
  }

  if (t === "album-apagar") {
    const { data: f } = await sb.from("wlr_album").select("id, path, thumb, autor_id").eq("id", body.id).maybeSingle();
    if (!f) return json({ ok: false, erro: "Foto não encontrada" }, 404);
    if (!admin && f.autor_id !== body.p_id) return json({ ok: false, erro: "Só quem enviou (ou o conselho) pode apagar esta foto" }, 403);
    await sb.storage.from(ALBUM).remove([f.path, f.thumb]);
    await sb.from("wlr_album").delete().eq("id", f.id);
    return json({ ok: true });
  }
  return json({ ok: false, erro: "Tarefa desconhecida" }, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const body = await req.json().catch(() => ({}));
  const task = body.task ?? "fila";
  const cfg = await carregaCfg();
  try {
    if (["preview", "contar", "enviar"].includes(task)) return await painel(body, cfg);
    if (String(task).startsWith("album-")) return await album(body, cfg);
    if (!SECRET || req.headers.get("x-wlr-secret") !== SECRET) return new Response("forbidden", { status: 403 });
    let out: unknown;
    if (task === "campanha") out = await campanha(body.tipo, cfg);
    else if (task === "analise-agora" && body.garrafa) out = await analisar(body.garrafa, cfg);   // síncrono (skill local)
    else if (task === "analise") {
      await destrava();
      const id = Deno.env.get("ANTHROPIC_API_KEY") ? (body.garrafa ?? await proximaPendente()) : undefined;
      if (id) EdgeRuntime.waitUntil(analisar(id, cfg).then(() => processaFila(cfg)));
      out = { analisando: id ?? null };
    } else {
      await destrava();
      const id = await proximaPendente();
      if (id) EdgeRuntime.waitUntil(analisar(id, cfg).then(() => processaFila(cfg)));
      out = { fila: await processaFila(cfg), fotos: await buscaFotos(), analisando: id ?? null };
    }
    return json({ ok: true, task, out });
  } catch (e) {
    return json({ ok: false, erro: String(e) }, 500);
  }
});
