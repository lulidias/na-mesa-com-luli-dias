// Magnum Fest — e-mails a partir dos modelos editáveis (wlr_email_modelos), no idioma de cada confrade.
// Corpo do modelo: parágrafos separados por linha em branco, **negrito**, {campos} e {{blocos}}.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type Cfg = Record<string, any>;
type Lang = "pt" | "es" | "en";
type Dados = Record<string, any>;

const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_ADDR = (Deno.env.get("EMAIL_FROM") ?? "").match(/<([^>]+)>/)?.[1] ?? (Deno.env.get("EMAIL_FROM") ?? "");
const FROM = `Wine Lovers Recife <${FROM_ADDR}>`;

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
const LOC: Record<Lang, string> = { pt: "pt-BR", es: "es-ES", en: "en-GB" };
const x = (l: Lang, pt: string, es: string, en: string) => (l === "es" ? es : l === "en" ? en : pt);

// ── textos fixos da moldura e dos blocos ─────────────────────────────────
const SIT: Record<string, [string, string, string, string]> = {   // pt, es, en, cor
  aprovado: ["✅ Aprovado", "✅ Aprobado", "✅ Approved", "#2E7D4F"],
  em_analise: ["⏳ Com o conselho da WLR", "⏳ Con el consejo de la WLR", "⏳ With the WLR board", "#6C214C"],
  inapto: ["❌ Não se encaixa nos critérios", "❌ No cumple los criterios", "❌ Does not meet the criteria", "#8A2A2A"],
  recusado: ["❌ Não aprovado pelo conselho", "❌ No aprobado por el consejo", "❌ Not approved by the board", "#8A2A2A"],
};
const sit = (s: string, l: Lang) => { const v = SIT[s] ?? SIT.em_analise; return l === "es" ? v[1] : l === "en" ? v[2] : v[0]; };
const TIPO: Record<string, [string, string, string]> = {
  "Espumante": ["Espumantes", "Espumosos", "Sparkling"], "Branco": ["Brancos", "Blancos", "Whites"],
  "Rosé": ["Rosés", "Rosados", "Rosés"], "Tinto": ["Tintos", "Tintos", "Reds"],
  "Fortificado / Doce": ["Porto, Sauternes & Tokaj", "Oporto, Sauternes y Tokaj", "Port, Sauternes & Tokaj"],
};
const ORDEM_TIPO = ["Espumante", "Branco", "Rosé", "Tinto", "Fortificado / Doce"];

export function primeiroNome(nome: string) {
  if (/Gurgel/i.test(nome)) return "Gurgel";   // é assim que o chamam
  return String(nome ?? "").split(" ")[0];
}

export function quando(cfg: Cfg, l: Lang) {
  const d = new Date(cfg.evento_em);
  const data = d.toLocaleDateString(LOC[l], { timeZone: "America/Recife", weekday: "long", day: "numeric", month: "long" });
  let hora = x(l, "horário a confirmar", "horario por confirmar", "time to be confirmed");
  if (cfg.hora_confirmada) {
    const h = d.toLocaleTimeString(LOC[l], { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" });
    hora = l === "en" ? h : h.replace(":00", "h").replace(":", "h");
  }
  return { data, hora };
}

function shell(cfg: Cfg, l: Lang, titulo: string, corpo: string, botao?: { href: string; label: string }) {
  const SITE = cfg.site_url;
  const { data, hora } = quando(cfg, l);
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F5F7;font-family:Georgia,serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#FFFFFF;color:#411A39;text-align:center;padding:30px 24px 26px;border:1px solid #E9DDE3;border-bottom:6px solid #6C214C">
      <img src="${SITE}img/logo.png" alt="Wine Lovers Recife" width="190" style="display:block;margin:0 auto 16px;width:190px;height:auto">
      <div style="font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:26px;letter-spacing:4px;color:#411A39">MAGNUM FEST</div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:16px;color:#6C214C;margin-top:4px">Licínio Dias · 2026</div>
      <div style="font-size:10px;letter-spacing:3px;color:#6C214C;font-family:Helvetica,Arial,sans-serif;margin-top:12px">${esc(`${data} · ${hora} · ${cfg.local_nome ?? ""}`.toUpperCase())}</div>
    </div>
    <div style="background:#fff;border:1px solid #E9DDE3;border-top:none;padding:32px 28px;color:#1F1A1D;font-size:15px;line-height:1.7">
      <h1 style="font-family:Georgia,serif;font-size:21px;font-weight:normal;margin:0 0 16px;color:#411A39">${titulo}</h1>
      ${corpo}
      ${botao && botao.label && botao.href ? `<p style="text-align:center;margin:28px 0 8px">
        <a href="${botao.href}" style="background:#6C214C;color:#fff;text-decoration:none;padding:13px 30px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px">${esc(botao.label)}</a></p>` : ""}
    </div>
    <p style="text-align:center;font-size:11px;color:#9A8A92;font-family:Helvetica,Arial,sans-serif;margin-top:16px">
      Magnum Fest Licínio Dias · ${x(l, "Organização", "Organiza", "Organised by")} Wine Lovers Recife</p>
  </div></body></html>`;
}

function tabelaCriterios(criterios: any[]) {
  if (!Array.isArray(criterios) || !criterios.length) return "";
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:6px 0">${criterios.map((c) =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #F0E6EB;width:22px;vertical-align:top">${c.ok === true ? "✅" : c.ok === false ? "❌" : "❔"}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #F0E6EB"><strong>${esc(c.rotulo)}</strong><br><span style="color:#6B5E65">${esc(c.detalhe)}</span></td></tr>`).join("")}</table>`;
}

// ── dados de apoio (carregados uma vez por lote) ────────────────────────
export type Ctx = { cfg: Cfg; vinhos: any[]; participantes: any[]; resultados: any[] | null };

export async function carregaCtx(sb: SupabaseClient, cfg: Cfg): Promise<Ctx> {
  const [{ data: vinhos }, { data: participantes }] = await Promise.all([
    sb.from("wlr_vinhos_publico").select("*"),
    sb.from("wlr_participantes").select("id, nome, email, idioma, confirmado, confirmado_em"),
  ]);
  let resultados: any[] | null = null;
  if (cfg.resultados_publicos) {
    const { data } = await sb.rpc("wlr_admin_resultados", { p_token: cfg.admin_token });
    resultados = data ?? [];
  }
  return { cfg, vinhos: vinhos ?? [], participantes: participantes ?? [], resultados };
}

function blocoCarta(ctx: Ctx, l: Lang) {
  const ap = ctx.vinhos.filter((v) => v.situacao === "aprovado");
  if (!ap.length) return `<p style="color:#6B5E65"><em>${x(l, "A carta ainda está vazia.", "La carta todavía está vacía.", "The list is still empty.")}</em></p>`;
  const por: Record<string, any[]> = {};
  for (const v of ap) (por[v.tipo] ??= []).push(v);
  return Object.keys(por).sort((a, b) => ORDEM_TIPO.indexOf(a) - ORDEM_TIPO.indexOf(b)).map((t) => {
    const nomeT = TIPO[t] ? (l === "es" ? TIPO[t][1] : l === "en" ? TIPO[t][2] : TIPO[t][0]) : t;
    return `<h3 style="font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#411A39;border-bottom:1px solid #E9DDE3;padding-bottom:6px;margin:22px 0 8px">${esc(nomeT)}</h3>` +
      por[t].map((v) => {
        const selo = v.selo ? (v.selo["resumo_" + l] || v.selo.resumo) : "";
        const quem = (v.membros ?? []).join(", ") || v.sigla || "";
        return `<p style="margin:0 0 8px"><strong>${esc(v.vinho)}${v.safra ? " " + esc(v.safra) : ""}</strong>` +
          `${v.produtor ? " — " + esc(v.produtor) : ""}${selo ? ` <span style="color:#6C214C;font-size:12px">· ${esc(selo)}</span>` : ""}` +
          `${quem ? `<br><span style="font-size:12px;color:#6B5E65">🍷 ${esc(quem)}</span>` : ""}</p>`;
      }).join("");
  }).join("");
}

function blocoNovidades(ctx: Ctx, l: Lang) {
  const desde = Date.now() - 15 * 864e5;
  const novos = ctx.participantes.filter((p) => p.confirmado && p.confirmado_em && new Date(p.confirmado_em).getTime() > desde);
  if (!novos.length) return "";
  return `<p style="background:#FBF4F7;border:1px dashed #6C214C;padding:14px">👋 ${x(l, "Confirmaram nos últimos 15 dias:", "Confirmaron en los últimos 15 días:", "Confirmed in the last 15 days:")} ` +
    `${esc(novos.map((p) => p.nome).join(", "))}</p>`;
}

function blocoMinhas(ctx: Ctx, l: Lang, pid: string) {
  const p = ctx.participantes.find((y) => y.id === pid);
  if (!p) return "";
  const minhas = ctx.vinhos.filter((v) => (v.membros ?? []).includes(p.nome));
  if (!minhas.length) return `<p style="color:#8A2A2A"><strong>${x(l, "Você ainda não registrou a sua Magnum.", "Todavía no registraste tu Magnum.", "You have not registered your Magnum yet.")}</strong></p>`;
  return `<p>${x(l, "A sua Magnum:", "Tu Magnum:", "Your Magnum:")}</p><ul>${minhas.map((v) =>
    `<li><strong>${esc(v.vinho)}${v.safra ? " " + esc(v.safra) : ""}</strong> — ${esc(sit(v.situacao, l))}</li>`).join("")}</ul>`;
}

function blocoCardapio(cfg: Cfg, l: Lang) {
  if (!cfg.cardapio) return "";
  return `<p><strong>${x(l, "Cardápio", "Menú", "Menu")}</strong><br>${esc(cfg.cardapio).replace(/\n/g, "<br>")}</p>`;
}

function blocoPodio(ctx: Ctx, l: Lang) {
  const r = ctx.resultados;
  if (!r || !r.length) return `<p style="color:#6B5E65"><em>${x(l, "O pódio aparece aqui quando os resultados forem publicados.", "El podio aparece aquí cuando se publiquen los resultados.", "The podium appears here once results are published.")}</em></p>`;
  const vistos = new Set<string>();
  const CAT: Record<string, [string, string]> = { "Melhor Vinho": ["Mejor Vino", "Best Wine"], "Melhor Tinto": ["Mejor Tinto", "Best Red"], "Melhor Branco": ["Mejor Blanco", "Best White"], "Melhor Espumante": ["Mejor Espumoso", "Best Sparkling"] };
  return r.filter((y) => !vistos.has(y.categoria_id) && vistos.add(y.categoria_id)).map((y) => {
    const cat = CAT[y.categoria] ? (l === "es" ? CAT[y.categoria][0] : l === "en" ? CAT[y.categoria][1] : y.categoria) : y.categoria;
    return `<p style="margin:0 0 12px">🏆 <strong>${esc(cat)}</strong><br>${esc(y.vinho)}${y.safra ? " " + esc(y.safra) : ""}` +
      `<br><span style="font-size:12px;color:#6B5E65">${x(l, "trazido por", "traído por", "brought by")} ${esc((y.membros ?? []).join(", "))}</span></p>`;
  }).join("");
}

function blocoPauta(ctx: Ctx, l: Lang) {
  const fila = ctx.vinhos.filter((v) => v.situacao === "em_analise");
  const conf = ctx.participantes.filter((p) => p.confirmado);
  const comAprov = new Set(ctx.vinhos.filter((v) => v.situacao === "aprovado").flatMap((v) => v.membros ?? []));
  const semVinho = conf.filter((p) => !comAprov.has(p.nome));
  return `<p><strong>${fila.length}</strong> ${x(l, "vinho(s) aguardando o conselho", "vino(s) esperando al consejo", "wine(s) waiting for the board")}` +
    (fila.length ? `:</p><ul>${fila.map((v) => `<li>${esc(v.vinho)}${v.safra ? " " + esc(v.safra) : ""} — ${esc((v.membros ?? []).join(", ") || v.sigla || "")}</li>`).join("")}</ul>` : ".</p>") +
    `<p><strong>${conf.length}</strong> ${x(l, "confrades confirmados", "cofrades confirmados", "confirmed members")} · ` +
    `<strong>${ctx.vinhos.filter((v) => v.situacao === "aprovado").length}</strong> ${x(l, "Magnums aprovadas", "Magnums aprobadas", "approved Magnums")}</p>` +
    (semVinho.length ? `<p>${x(l, "Confirmados sem Magnum aprovada:", "Confirmados sin Magnum aprobada:", "Confirmed without an approved Magnum:")} ${esc(semVinho.map((p) => p.nome).join(", "))}</p>` : "");
}

// ── montagem a partir do modelo ─────────────────────────────────────────
function paragrafos(texto: string, vars: Record<string, string>, blocos: Record<string, string>) {
  return String(texto ?? "").split(/\n\s*\n/).map((par) => {
    const t = par.trim();
    const soBloco = t.match(/^\{\{(\w+)\}\}$/);
    if (soBloco) return blocos[soBloco[1]] ?? "";
    let h = esc(t).replace(/\{\{(\w+)\}\}/g, (_, k) => blocos[k] ?? "");
    h = h.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
    return h ? `<p>${h}</p>` : "";
  }).join("\n");
}
const simples = (t: string, vars: Record<string, string>) =>
  String(t ?? "").replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`)).replace(/\*\*/g, "");

export function monta(modelo: any, tipo: string, d: Dados, ctx: Ctx, l: Lang, rascunho?: any) {
  const cfg = ctx.cfg;
  const SITE = cfg.site_url;
  const t = rascunho ?? modelo?.textos?.[l] ?? modelo?.textos?.pt ?? {};
  const pid = String(d.participante_id ?? "");
  const { data, hora } = quando(cfg, l);
  const dias = Math.max(0, Math.ceil((new Date(cfg.evento_em).getTime() - Date.now()) / 864e5));
  const situacao = String(d.situacao ?? (d.decisao === "aprovado" ? "aprovado" : d.decisao === "recusado" ? "recusado" : "em_analise"));
  const crit = (d.criterios_i18n && d.criterios_i18n[l]) || d.criterios || [];
  const resumo = (d.resumo_i18n && d.resumo_i18n[l]) || d.resumo || (tipo === "conselho-avaliar" ? d.motivo : "") || "";
  const proximo = situacao === "inapto"
    ? x(l, "Pode trocar o vinho no painel — ou, se ele merece a mesa por raridade ou singularidade, pedir a análise do conselho (cláusula 6.1).", "Puedes cambiar el vino en tu panel o, si merece la mesa por rareza o singularidad, pedir el análisis del consejo (cláusula 6.1).", "You can change the wine in your panel — or, if it deserves a place for its rarity or uniqueness, ask for the board's review (clause 6.1).")
    : situacao === "em_analise" ? x(l, "O conselho da WLR vai avaliar e você recebe a decisão por e-mail.", "El consejo de la WLR lo evaluará y recibirás la decisión por e-mail.", "The WLR board will review it and you will get the decision by email.")
    : situacao === "recusado" ? x(l, "Registre outra Magnum no painel — o sistema confere os critérios na hora.", "Registra otra Magnum en tu panel: el sistema verifica los criterios al instante.", "Register another Magnum in your panel — the system checks the criteria on the spot.")
    : x(l, "Ele já aparece na carta da festa. 🥂", "Ya aparece en la carta de la fiesta. 🥂", "It is already on the party's wine list. 🥂");
  const valor = cfg.valor_no_dia
    ? Number(cfg.valor_no_dia).toLocaleString(LOC[l], { style: "currency", currency: "BRL" })
    : x(l, "a definir", "por definir", "to be confirmed");
  const vars: Record<string, string> = {
    nome: esc(primeiroNome(String(d.nome ?? d.conselheiro ?? x(l, "confrade", "cofrade", "member")))),
    data: esc(data), hora: esc(hora), local: esc([cfg.local_nome, cfg.local_detalhe].filter(Boolean).join(", ")),
    valor: esc(valor), dias: String(dias),
    n_confirmados: String(ctx.participantes.filter((p) => p.confirmado).length),
    n_magnums: String(ctx.vinhos.filter((v) => v.situacao === "aprovado").length),
    vinho: esc(`${d.vinho ?? ""}${d.safra ? " " + d.safra : ""}`), situacao: esc(sit(situacao, l)), resumo: esc(resumo),
    decisao: esc(d.decisao === "aprovado" ? x(l, "aprovou", "aprobó", "approved") : x(l, "não aprovou", "no aprobó", "did not approve")),
    motivo: d.motivo ? esc(d.motivo) : "", por: esc(d.por ?? ""), aparelho: esc(d.aparelho || x(l, "um navegador", "un navegador", "a browser")), confrade: esc(d.confrade ?? ""), proximo_passo: esc(proximo),
  };
  const blocos: Record<string, string> = {
    criterios: tabelaCriterios(crit), carta: blocoCarta(ctx, l), novidades: blocoNovidades(ctx, l),
    minhas_garrafas: pid ? blocoMinhas(ctx, l, pid) : "", cardapio: blocoCardapio(cfg, l),
    podio: blocoPodio(ctx, l), pauta: blocoPauta(ctx, l),
  };
  const painel = pid ? `${SITE}?id=${pid}` : SITE;
  const href = tipo === "aprovar-dispositivo" ? `${SITE}?aprovar=${d.token ?? ""}`
    : tipo === "votacao-aberta" ? `${SITE}votar/`
    : (tipo === "conselho-avaliar" || tipo === "pauta-conselho") ? `${SITE}admin.html?t=${d.token ?? ""}${d.garrafa_id ? "#g-" + d.garrafa_id : ""}`
    : (tipo === "resumo" || tipo === "carta-fechada") ? `${painel}#vinhos`
    : (tipo === "resultados" || tipo === "agradecimento") ? `${painel}#resultados`
    : `${painel}#rsvp`;
  return {
    subject: simples(t.assunto ?? "Magnum Fest Licínio Dias 2026", { ...vars, vinho: `${d.vinho ?? ""}${d.safra ? " " + d.safra : ""}`, situacao: sit(situacao, l), confrade: String(d.confrade ?? "") }),
    html: shell(cfg, l, paragrafos(t.titulo ?? "", vars, {}).replace(/^<p>|<\/p>$/g, ""), paragrafos(t.corpo ?? "", vars, blocos), { href, label: t.botao ?? "" }),
  };
}

// ── envio ────────────────────────────────────────────────────────────────
export async function enviar(para: string, subject: string, html: string, replyTo: string, remetente?: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    // remetente próprio da confraria (wlr_config.email_remetente) quando o domínio estiver verificado no Resend
    body: JSON.stringify({ from: remetente ? `Wine Lovers Recife <${remetente}>` : FROM, to: [para], reply_to: replyTo, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

export async function carregaModelos(sb: SupabaseClient) {
  const { data } = await sb.from("wlr_email_modelos").select("*");
  const m: Record<string, any> = {};
  for (const r of data ?? []) m[r.tipo] = r;
  return m;
}

export async function processaFila(sb: SupabaseClient, cfg: Cfg) {
  const { data: fila } = await sb.from("wlr_emails").select("*").eq("status", "pendente").lt("tentativas", 5)
    .order("criado_em").limit(25);
  if (!fila?.length) return { ok: 0, err: 0 };
  const [modelos, ctx] = await Promise.all([carregaModelos(sb), carregaCtx(sb, cfg)]);
  const replyTo = cfg.email_resposta || "lulidias@me.com";
  let ok = 0, err = 0;
  for (const row of fila) {
    const d = row.dados ?? {};
    const modelo = modelos[row.tipo];
    // modelo desligado no painel: automáticos e agendados não saem (envio manual passa)
    if (modelo && !modelo.ativo && !d.manual && row.tipo !== "aprovar-dispositivo") {   // aprovação de acesso nunca é bloqueada
      await sb.from("wlr_emails").update({ status: "desligado" }).eq("id", row.id);
      continue;
    }
    try {
      const p = d.participante_id ? ctx.participantes.find((y) => y.id === d.participante_id) : null;
      const l = (d.idioma || p?.idioma || "pt") as Lang;
      if (!modelo) throw new Error(`Sem modelo para ${row.tipo}`);
      const { subject, html } = monta(modelo, row.tipo, d, ctx, l);
      await enviar(row.para, subject, html, replyTo, cfg.email_remetente || undefined);
      await sb.from("wlr_emails").update({ status: "enviado", enviado_em: new Date().toISOString() }).eq("id", row.id);
      ok++;
    } catch (e) {
      const t = (row.tentativas ?? 0) + 1;
      await sb.from("wlr_emails").update({ tentativas: t, erro: String(e).slice(0, 500), status: t >= 5 ? "erro" : "pendente" }).eq("id", row.id);
      err++;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { ok, err };
}

// ── públicos (campanhas e envio manual) ─────────────────────────────────
export async function destinatarios(sb: SupabaseClient, publico: string, participante?: string) {
  if (publico === "conselho") {
    const { data } = await sb.from("wlr_conselho").select("nome, email, token").not("email", "is", null);
    return (data ?? []).map((c) => ({ para: c.email, dados: { conselheiro: c.nome, nome: c.nome, token: c.token, idioma: "pt" } }));
  }
  const { data: ps } = await sb.from("wlr_participantes").select("id, nome, email, confirmado").not("email", "is", null);
  let lista = (ps ?? []).filter((p) => p.email);
  if (publico === "um") lista = lista.filter((p) => p.id === participante);
  else if (publico === "todos") { /* todos com e-mail */ }
  else lista = lista.filter((p) => p.confirmado);
  if (publico === "sem_magnum") {
    const { data: vs } = await sb.from("wlr_vinhos_publico").select("membros, situacao").eq("situacao", "aprovado");
    const com = new Set((vs ?? []).flatMap((v) => v.membros ?? []));
    lista = lista.filter((p) => !com.has(p.nome));
  }
  return lista.map((p) => ({ para: p.email, dados: { nome: p.nome, participante_id: p.id } }));
}

export async function enfileira(sb: SupabaseClient, tipo: string, alvos: { para: string; dados: Dados }[], extra: Dados = {}) {
  if (!alvos.length) return 0;
  const linhas = alvos.map((a) => ({ tipo, para: a.para, dados: { ...a.dados, ...extra } }));
  const { error } = await sb.from("wlr_emails").insert(linhas);
  if (error) throw new Error(error.message);
  return linhas.length;
}

// dados de exemplo para a miniatura/pré-visualização do painel
export function exemplo(tipo: string, ctx: Ctx): Dados {
  const alguem = ctx.participantes.find((p) => p.confirmado) ?? ctx.participantes[0] ?? { nome: "Confrade", id: "" };
  const v = ctx.vinhos.find((y) => y.situacao === "aprovado") ?? { vinho: "Château Cos d'Estournel", safra: "1991" };
  const crit = [
    { ok: true, rotulo: "Formato Magnum ou maior", detalhe: "1,5 L" },
    { ok: true, rotulo: "Nota ≥ 95 (RP, WS ou JS) ou preço ≥ € 400", detalhe: "RP 96 · preço € 520" },
    { ok: true, rotulo: "Safra até 2015", detalhe: "safra 1991" },
  ];
  const base: Dados = { nome: alguem.nome, participante_id: alguem.id, vinho: v.vinho, safra: v.safra, confrade: alguem.nome,
    criterios: crit, resumo: "Atende a todos os critérios da MFLD.", situacao: "aprovado" };
  if (tipo === "aprovar-dispositivo") return { ...base, token: "…", aparelho: "iPhone · Safari" };
  if (tipo === "decisao-conselho") return { ...base, decisao: "aprovado", motivo: "Grande escolha — entra na carta.", por: "Gurgel" };
  if (tipo === "conselho-avaliar" || tipo === "pauta-conselho") return { ...base, nome: "Fernando Gurgel", conselheiro: "Fernando Gurgel", token: "…", situacao: "em_analise", resumo: "Brancos, espumantes e doces precisam do aval do conselho (cláusula 7.1)." };
  return base;
}
