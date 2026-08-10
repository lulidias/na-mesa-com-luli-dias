// A Confra das Confras — worker: fila de e-mails, fotos de garrafas e resumo semanal
// Secrets: CONFRAS_CRON_SECRET, RESEND_API_KEY, EMAIL_FROM (+ SUPABASE_* automáticos)
// Deploy: supabase functions deploy confras-worker --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const SECRET = Deno.env.get("CONFRAS_CRON_SECRET") ?? "";
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("EMAIL_FROM") ?? "";
const SITE = "https://lulidias.com/confras/";
const REPLY_TO = "lulidias@me.com";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

function shell(titulo: string, corpo: string, participanteId?: string) {
  const link = participanteId ? `${SITE}?id=${participanteId}#rsvp` : SITE;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F3EE;font-family:Georgia,serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background-color:#1A2F4E;background:linear-gradient(180deg,#2A4468 0%,#1A2F4E 45%,#101F38 100%);color:#F7F3EE;text-align:center;padding:36px 24px;border:1px solid #B8922A">
      <div style="font-size:10px;letter-spacing:5px;color:#D4AE5C;font-family:Helvetica,Arial,sans-serif">RECIFE · 18 DE NOVEMBRO DE 2026 · 13H</div>
      <div style="font-family:Didot,'Bodoni 72','Playfair Display',Georgia,serif;font-weight:normal;font-size:32px;letter-spacing:7px;margin-top:12px">CONFRA<br>DAS CONFRAS</div>
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-style:italic;color:#D4AE5C;margin-top:10px">O maior encontro de vinhos da história de Pernambuco</div>
    </div>
    <div style="background:#fff;border:1px solid #E8E0D5;border-top:none;padding:32px 28px;color:#1A1A1A;font-size:15px;line-height:1.7">
      <h1 style="font-family:'Playfair Display',Didot,Georgia,serif;font-size:21px;font-weight:normal;margin:0 0 16px">${titulo}</h1>
      ${corpo}
      <p style="text-align:center;margin:28px 0 8px">
        <a href="${link}" style="background:#B8922A;color:#fff;text-decoration:none;padding:13px 30px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px">ABRIR MEU PAINEL</a>
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#9A9A9A;font-family:Helvetica,Arial,sans-serif;margin-top:16px">
      Grandes vinhos, grandes garrafas, grandes amigos. · Organização <a href="https://lulidias.com" style="color:#B8922A">Luli Dias</a>
    </p>
  </div></body></html>`;
}

async function render(tipo: string, dados: Record<string, unknown>, cfg: Record<string, unknown>) {
  const nome = esc(String(dados.nome ?? "confrade").split(" ")[0]);
  const pid = String(dados.participante_id ?? "");
  switch (tipo) {
    case "boas-vindas":
      return {
        subject: "🥂 Presença confirmada — Confra das Confras 2026",
        html: shell(`Presença confirmada, ${nome}!`, `
          <p>Que alegria ter você na mesa. Anote: <strong>quarta-feira, 18 de novembro, 13h</strong>, na <strong>Paris Saint-Germain Academy</strong>, Recife.</p>
          <p>Lembre da regra de ouro: cada confrade leva no mínimo <strong>1,5 litro</strong> de vinho — uma Magnum. Pode trazer formatos maiores sozinho, dividir com outros confrades e levar quantas garrafas quiser.</p>
          <p>Registre sua garrafa no seu painel — a carta da festa cresce a cada dia.</p>`, pid),
      };
    case "garrafa-registrada": {
      const v = `${esc(dados.vinho)}${dados.safra ? " " + esc(dados.safra) : ""}`;
      return {
        subject: `🍷 ${String(dados.vinho)} está na mesa — Confra das Confras`,
        html: shell(`Grande escolha, ${nome}!`, `
          <p>Sua garrafa está registrada na carta da festa:</p>
          <p style="background:#FAF5EB;border:1px dashed #B8922A;padding:16px;text-align:center;font-size:17px">
            <strong>${v}</strong><br><span style="font-size:13px;color:#5A5A5A">${esc(dados.formato)} · ${esc(dados.litros)} L · ${esc(dados.tipo)}</span></p>
          <p>Veja no site o que os outros confrades vão levar — e sinta-se livre para registrar mais garrafas.</p>`, pid),
      };
    }
    case "rateio-definido": {
      const valor = Number(cfg.valor_rateio ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return {
        subject: `💰 Rateio do churrasco: ${valor} — como pagar`,
        html: shell(`${nome}, o rateio está definido`, `
          <p>O custo do churrasco ficou em <strong>${valor} por confrade</strong>, rateado igualmente entre todos.</p>
          <p>Pague por Pix para <strong>${esc(cfg.chave_pix)}</strong>${cfg.nome_pix ? ` (${esc(cfg.nome_pix)})` : ""} — no seu painel você encontra o QR code, o copia-e-cola e o envio do comprovante em três passos.</p>`, pid),
      };
    }
    case "pagamento-confirmado":
      return {
        subject: "✅ Pagamento confirmado — Confra das Confras",
        html: shell(`Tudo certo, ${nome}!`, `
          <p>Seu pagamento do rateio foi <strong>confirmado</strong>. Obrigado!</p>
          <p>Agora é só aguardar o grande dia — 18 de novembro, 13h. 🥂</p>`, pid),
      };
    case "votacao-aberta":
      return {
        subject: "🗳️ A urna está aberta — vote nos melhores vinhos",
        html: shell(`${nome}, a votação começou!`, `
          <p>A urna da Confra das Confras está aberta. Vote nos melhores vinhos da festa — um voto por categoria, e você pode mudar de ideia enquanto a urna estiver aberta.</p>`, pid),
      };
    case "resultados":
      return {
        subject: "🏆 Saiu o resultado — os melhores vinhos da festa",
        html: shell(`${nome}, temos vencedores!`, `
          <p>A apuração terminou e os vencedores de cada categoria estão publicados no site. Veja quem levou o título de Melhor Vinho da Festa.</p>`, pid),
      };
    case "lembrete": {
      const garrafas = Array.isArray(dados.garrafas) ? dados.garrafas as Record<string, unknown>[] : [];
      const lista = garrafas.length
        ? `<p>Suas garrafas confirmadas:</p><ul>${garrafas.map((g) =>
          `<li><strong>${esc(g.vinho)}${g.safra ? " " + esc(g.safra) : ""}</strong> (${esc(g.formato)})</li>`).join("")}</ul>`
        : `<p style="color:#B85C2A"><strong>Você ainda não registrou nenhuma garrafa</strong> — lembre: o mínimo é 1,5 L por confrade.</p>`;
      const pago = dados.pago
        ? `<p>Rateio: <strong style="color:#2E7D4F">✓ pago</strong>. Obrigado!</p>`
        : `<p>Rateio: <strong style="color:#B85C2A">pendente</strong> — pague pelo painel para garantir seu lugar.</p>`;
      const quando = String(dados.quando ?? "");
      const MARCOS: Record<string, { assunto: string; titulo: string }> = {
        "100-dias": { assunto: "💯 Faltam 100 dias — Confra das Confras", titulo: `${nome}, faltam 100 dias!` },
        "50-dias": { assunto: "🍷 Faltam 50 dias — Confra das Confras", titulo: `${nome}, faltam só 50 dias` },
        "1-mes": { assunto: "📅 Falta 1 mês — Confra das Confras", titulo: `${nome}, falta um mês para o grande dia` },
        "1-semana": { assunto: "📅 Falta 1 semana — Confra das Confras", titulo: `${nome}, falta só uma semana` },
        "hoje": { assunto: "🍷 É HOJE — Confra das Confras, 13h!", titulo: `${nome}, é hoje! 🥂` },
      };
      const marco = MARCOS[quando] ?? MARCOS["1-mes"];
      const assunto = marco.assunto;
      const titulo = marco.titulo;
      const abertura = quando === "hoje"
        ? `<p><strong>Hoje, 13h</strong> — Paris Saint-Germain Academy, Recife. Não esqueça as suas garrafas!</p>`
        : `<p><strong>Quarta-feira, 18 de novembro, 13h</strong> — Paris Saint-Germain Academy, Recife.</p>`;
      return {
        subject: assunto,
        html: shell(titulo, `${abertura}${lista}${pago}
          <p>Todos os vinhos serão abertos ao mesmo tempo, em uma grande mesa self-service. ${quando === "hoje" ? "Até já!" : "Até lá!"} 🥂</p>`, pid),
      };
    }
    default:
      return { subject: "Confra das Confras 2026", html: shell("Novidades", "<p>Acesse o site para ver as novidades.</p>", pid) };
  }
}

async function enviar(para: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [para], reply_to: REPLY_TO, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function processaFila() {
  const { data: cfgRow } = await sb.from("confras_config").select("*").eq("id", 1).single();
  const cfg = cfgRow ?? {};
  const { data: fila } = await sb.from("confras_emails")
    .select("*").eq("status", "pendente").lt("tentativas", 5)
    .order("criado_em").limit(25);
  let ok = 0, err = 0;
  for (const row of fila ?? []) {
    try {
      const { subject, html } = await render(row.tipo, row.dados ?? {}, cfg);
      await enviar(row.para, subject, html);
      await sb.from("confras_emails").update({ status: "enviado", enviado_em: new Date().toISOString() }).eq("id", row.id);
      ok++;
    } catch (e) {
      await sb.from("confras_emails").update({
        tentativas: (row.tentativas ?? 0) + 1,
        erro: String(e).slice(0, 500),
        status: (row.tentativas ?? 0) + 1 >= 5 ? "erro" : "pendente",
      }).eq("id", row.id);
      err++;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { ok, err, total: (fila ?? []).length };
}

async function buscaFotos() {
  const { data: garrafas } = await sb.from("confras_garrafas")
    .select("id, vinho, safra, produtor").is("foto_url", null).limit(6);
  let achadas = 0;
  for (const g of garrafas ?? []) {
    let url: string | null = null;
    try {
      const q = encodeURIComponent([g.vinho, g.safra].filter(Boolean).join(" "));
      const r = await fetch(`https://www.vivino.com/search/wines?q=${q}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/\/\/images\.vivino\.com\/thumbs\/[A-Za-z0-9_-]+_p[bl]_[0-9a-zA-Zx]+\.(?:png|jpe?g)/);
        // padrão: garrafa inteira (_pb_), sem cortar o gargalo — não o rótulo (_pl_)
        if (m) url = "https:" + m[0].replace(/_pl_[0-9a-zA-Zx]+\./, "_pb_x600.");
      }
    } catch (_) { /* melhor esforço */ }
    // '' marca "já tentei, não achei" (admin pode definir manualmente)
    await sb.from("confras_garrafas").update({ foto_url: url ?? "" }).eq("id", g.id);
    if (url) achadas++;
    await new Promise((r) => setTimeout(r, 800));
  }
  return { tentadas: (garrafas ?? []).length, achadas };
}

async function resumoSemanal(apenas?: string) {
  const { data: parts } = await sb.from("confras_participantes").select("id, nome, email, criado_em");
  // o filtro "apenas" vale SÓ para quem recebe — as estatísticas são sempre da mesa inteira
  const destinatarios = apenas ? (parts ?? []).filter((p) => p.email === apenas) : (parts ?? []);
  const { data: garrafas } = await sb.from("confras_garrafas")
    .select("id, vinho, safra, formato, tipo, pais, litros, vagas, criado_em").order("tipo").order("pais");
  const { data: membros } = await sb.from("confras_garrafa_membros").select("garrafa_id");
  const ocupadas: Record<string, number> = {};
  for (const m of membros ?? []) ocupadas[m.garrafa_id] = (ocupadas[m.garrafa_id] ?? 0) + 1;
  const semana = Date.now() - 7 * 864e5;
  const novasG = (garrafas ?? []).filter((g) => new Date(g.criado_em).getTime() > semana);
  const novosP = (parts ?? []).filter((p) => new Date(p.criado_em).getTime() > semana);
  // litros comprometidos: proporcional às vagas ocupadas (mesma conta do site)
  const litros = Math.round((garrafas ?? []).reduce((s, g) => {
    const vagas = Math.max(1, Number(g.vagas ?? 1));
    return s + Number(g.litros) * (Math.min(ocupadas[g.id] ?? 0, vagas) / vagas);
  }, 0) * 10) / 10;

  const ordem = ["Espumante", "Branco", "Rosé", "Tinto", "Fortificado / Doce"];
  const porTipo: Record<string, typeof novasG> = {};
  for (const g of garrafas ?? []) (porTipo[g.tipo ?? "Tinto"] ??= []).push(g);
  const carta = Object.keys(porTipo)
    .sort((a, b) => (ordem.indexOf(a) + 99) - (ordem.indexOf(b) + 99) || a.localeCompare(b))
    .map((t) =>
      `<h3 style="color:#101F38;border-bottom:1px solid #E8E0D5;padding-bottom:6px">${esc(t)}s</h3><ul>` +
      porTipo[t].map((g) =>
        `<li><strong>${esc(g.vinho)}${g.safra ? " " + esc(g.safra) : ""}</strong> — ${esc(g.formato)}${g.pais ? " · " + esc(g.pais) : ""}</li>`).join("") + "</ul>").join("");

  const novidades = (novasG.length || novosP.length)
    ? `<p style="background:#FAF5EB;border:1px dashed #B8922A;padding:14px"><strong>Novidades da semana:</strong><br>
       ${novosP.length ? `👋 ${novosP.length} confrade(s) confirmaram: ${esc(novosP.map((p) => p.nome).join(", "))}<br>` : ""}
       ${novasG.length ? `🍷 ${novasG.length} garrafa(s) novas: ${esc(novasG.map((g) => g.vinho + (g.safra ? " " + g.safra : "")).join(", "))}` : ""}</p>`
    : `<p><em>Sem novidades esta semana — que tal chamar mais um confrade?</em></p>`;

  const corpo = `${novidades}
    <p>A mesa já soma <strong>${(parts ?? []).length} confrades</strong>, <strong>${(garrafas ?? []).length} garrafas</strong> e <strong>${litros.toLocaleString("pt-BR")} litros</strong>.</p>
    <h2 style="font-size:18px;font-weight:normal">A carta até agora</h2>${carta}`;

  let enviados = 0;
  for (const p of destinatarios) {
    if (!p.email) continue;
    try {
      await enviar(p.email, "🍷 A carta da Confra das Confras — resumo da semana",
        shell(`${esc(p.nome.split(" ")[0])}, a mesa está crescendo`, corpo, p.id));
      enviados++;
    } catch (_) { /* segue para o próximo */ }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { enviados };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-confras-secret") !== SECRET || !SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const task = body.task ?? "fila";
  try {
    let out: unknown;
    if (task === "resumo-semanal") out = await resumoSemanal(body.apenas);
    else out = { fila: await processaFila(), fotos: await buscaFotos() };
    return new Response(JSON.stringify({ ok: true, task, out }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), { status: 500 });
  }
});
