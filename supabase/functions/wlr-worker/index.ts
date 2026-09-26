// Magnum Fest Licínio Dias 2026 (Wine Lovers Recife) — worker:
// fila de e-mails, fotos das garrafas, resumo semanal e ANÁLISE DOS VINHOS pelos critérios da MFLD.
// Secrets: WLR_CRON_SECRET, ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM (+ SUPABASE_* automáticos)
// Deploy: supabase functions deploy wlr-worker --no-verify-jwt --project-ref saotncritqxuchsvvnzi

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { avaliar, BRANCO_REGIOES_VELHO_MUNDO, type Fatos } from "./criterios.ts";

const SECRET = Deno.env.get("WLR_CRON_SECRET") ?? "";
const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
// mesmo endereço do EMAIL_FROM, com o nome da confraria como remetente
const FROM_ADDR = (Deno.env.get("EMAIL_FROM") ?? "").match(/<([^>]+)>/)?.[1] ?? (Deno.env.get("EMAIL_FROM") ?? "");
const FROM = `Wine Lovers Recife <${FROM_ADDR}>`;
const REPLY_TO = "lulidias@me.com";
const MODELO = "claude-opus-5";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Cfg = Record<string, any>;
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

async function carregaCfg(): Promise<Cfg> {
  const { data } = await sb.from("wlr_config").select("*").eq("id", 1).single();
  return data ?? {};
}
function quando(cfg: Cfg, curto = false) {
  const d = new Date(cfg.evento_em);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: "America/Recife", weekday: "long", day: "numeric", month: "long" });
  const hora = cfg.hora_confirmada
    ? d.toLocaleTimeString("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h")
    : "horário a confirmar";
  return curto ? `${dia.toUpperCase()} · ${hora.toUpperCase()}` : `${dia}, ${hora}`;
}

// ── e-mails ───────────────────────────────────────────────────────────────
function shell(cfg: Cfg, titulo: string, corpo: string, participanteId?: string, botao?: { href: string; label: string }) {
  const SITE = cfg.site_url;
  const link = botao ? botao.href : (participanteId ? `${SITE}?id=${participanteId}#rsvp` : SITE);
  const rotulo = botao ? botao.label : "ABRIR MEU PAINEL";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F5F7;font-family:Georgia,serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#FFFFFF;color:#411A39;text-align:center;padding:30px 24px 26px;border:1px solid #E9DDE3;border-bottom:6px solid #6C214C">
      <img src="${SITE}img/logo.png" alt="Wine Lovers Recife" width="190" style="display:block;margin:0 auto 16px;width:190px;height:auto">
      <div style="font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:26px;letter-spacing:4px;color:#411A39">MAGNUM FEST</div>
      <div style="font-family:Georgia,serif;font-style:italic;font-size:16px;color:#6C214C;margin-top:4px">Licínio Dias · 2026</div>
      <div style="font-size:10px;letter-spacing:3px;color:#6C214C;font-family:Helvetica,Arial,sans-serif;margin-top:12px">${esc(quando(cfg, true))} · ${esc(String(cfg.local_nome ?? "").toUpperCase())}</div>
    </div>
    <div style="background:#fff;border:1px solid #E9DDE3;border-top:none;padding:32px 28px;color:#1F1A1D;font-size:15px;line-height:1.7">
      <h1 style="font-family:Georgia,serif;font-size:21px;font-weight:normal;margin:0 0 16px;color:#411A39">${titulo}</h1>
      ${corpo}
      ${botao && !botao.href ? "" : `<p style="text-align:center;margin:28px 0 8px">
        <a href="${link}" style="background:#6C214C;color:#fff;text-decoration:none;padding:13px 30px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px">${rotulo}</a></p>`}
    </div>
    <p style="text-align:center;font-size:11px;color:#9A8A92;font-family:Helvetica,Arial,sans-serif;margin-top:16px">
      Magnum Fest Licínio Dias · Organização Wine Lovers Recife</p>
  </div></body></html>`;
}

const SIT: Record<string, [string, string]> = {
  aprovado: ["✅ Aprovado", "#2E7D4F"], em_analise: ["⏳ Com o conselho", "#6C214C"],
  inapto: ["❌ Não se encaixa nos critérios", "#8A2A2A"], recusado: ["❌ Não aprovado pelo conselho", "#8A2A2A"],
};
function listaCriterios(criterios: any[]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:10px 0">${criterios.map((c) =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #F0E6EB;width:22px">${c.ok === true ? "✅" : c.ok === false ? "❌" : "❔"}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #F0E6EB"><strong>${esc(c.rotulo)}</strong><br><span style="color:#6B5E65">${esc(c.detalhe)}</span></td></tr>`).join("")}</table>`;
}

function render(tipo: string, d: Record<string, any>, cfg: Cfg) {
  const nome = esc(String(d.nome ?? "confrade").split(" ")[0]);
  const pid = String(d.participante_id ?? "");
  const SITE = cfg.site_url;
  const vinho = `${esc(d.vinho)}${d.safra ? " " + esc(d.safra) : ""}`;
  const local = `${esc(cfg.local_nome)}, ${esc(cfg.local_detalhe)}`;
  switch (tipo) {
    case "boas-vindas":
      return {
        subject: "🍷 Presença confirmada — Magnum Fest Licínio Dias 2026",
        html: shell(cfg, `Presença confirmada, ${nome}!`, `
          <p>Anote: <strong>${esc(quando(cfg))}</strong>, no <strong>${local}</strong>.</p>
          <p>É uma Magnum Fest: cada confrade leva <strong>uma Magnum (1,5 L)</strong>. Não há rateio antecipado — o restaurante cobra de cada um no dia. Cada vinho passa pelos critérios da MFLD (nota mínima de 95 pontos em Robert Parker, Wine Spectator ou James Suckling, ou preço de € 400 ou mais, entre outras regras).</p>
          <p>Registre a sua garrafa no painel: o sistema confere os critérios na hora e avisa se ela entra direto ou se vai para o conselho.</p>`, pid),
      };
    case "garrafa-registrada":
      return {
        subject: `🍷 ${String(d.vinho)} registrado — analisando os critérios`,
        html: shell(cfg, `Recebemos a sua garrafa, ${nome}`, `
          <p style="background:#FBF4F7;border:1px dashed #6C214C;padding:16px;text-align:center;font-size:17px">
            <strong>${vinho}</strong><br><span style="font-size:13px;color:#6B5E65">${esc(d.tipo)}</span></p>
          <p>Estamos conferindo notas de crítica, preço e as demais regras da MFLD. Em alguns minutos o parecer aparece no seu painel e chega por e-mail.</p>`, pid),
      };
    case "parecer": {
      const [rot, cor] = SIT[String(d.situacao)] ?? SIT.em_analise;
      const extra = d.situacao === "inapto"
        ? `<p>Pode trocar o vinho no painel — ou, se achar que ele merece a mesa por raridade ou singularidade, pedir a análise do conselho (cláusula 6.1).</p>`
        : d.situacao === "em_analise"
          ? `<p>O conselho da WLR vai avaliar e você recebe a decisão por e-mail.</p>`
          : `<p>Ele já aparece na carta da festa. 🥂</p>`;
      return {
        subject: `${rot.split(" ")[0]} ${String(d.vinho)} — parecer da MFLD`,
        html: shell(cfg, `${nome}, o parecer do seu vinho`, `
          <p style="font-size:17px;margin:0 0 4px"><strong>${vinho}</strong></p>
          <p style="color:${cor};font-weight:bold;margin:0 0 10px">${rot}</p>
          <p>${esc(d.resumo)}</p>${listaCriterios(d.criterios ?? [])}${extra}`, pid),
      };
    }
    case "conselho-avaliar":
      return {
        subject: `🛡️ Conselho: avaliar ${String(d.vinho)}${d.safra ? " " + d.safra : ""} (${String(d.confrade)})`,
        html: shell(cfg, `${esc(String(d.conselheiro ?? "").split(" ")[0])}, um vinho aguarda o conselho`, `
          <p><strong>${esc(d.confrade)}</strong> registrou <strong>${vinho}</strong>.</p>
          <p>${esc(d.motivo)}</p>${d.criterios ? listaCriterios(d.criterios) : ""}
          <p>Aprove ou recuse no painel do conselho — a decisão fica registrada com o seu nome e o confrade é avisado.</p>`,
          undefined, { href: `${SITE}admin.html?t=${d.token}#g-${d.garrafa_id}`, label: "ABRIR O PAINEL DO CONSELHO" }),
      };
    case "decisao-conselho": {
      const ok = d.decisao === "aprovado";
      return {
        subject: `${ok ? "✅" : "❌"} ${String(d.vinho)} — decisão do conselho`,
        html: shell(cfg, ok ? `${nome}, seu vinho está na mesa!` : `${nome}, sobre o seu vinho`, `
          <p>O conselho da Wine Lovers Recife ${ok ? "<strong>aprovou</strong>" : "<strong>não aprovou</strong>"} o <strong>${vinho}</strong> para a Magnum Fest.</p>
          ${d.motivo ? `<p style="background:#FBF4F7;border-left:3px solid #6C214C;padding:10px 14px">${esc(d.motivo)}</p>` : ""}
          <p>${ok ? "Ele já aparece na carta da festa. 🥂" : "Registre outra garrafa no painel — o sistema confere os critérios na hora."}</p>`, pid),
      };
    }
    case "rateio-definido": {
      const valor = Number(cfg.valor_rateio ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return {
        subject: `💰 Rateio da Magnum Fest: ${valor} — como pagar`,
        html: shell(cfg, `${nome}, o rateio está definido`, `
          <p>O rateio ficou em <strong>${valor} por confrade</strong>.</p>
          <p>Pague por Pix para <strong>${esc(cfg.chave_pix)}</strong>${cfg.nome_pix ? ` (${esc(cfg.nome_pix)})` : ""} — no seu painel estão o QR code, o copia-e-cola e o envio do comprovante.</p>`, pid),
      };
    }
    case "pagamento-confirmado":
      return { subject: "✅ Pagamento confirmado — Magnum Fest", html: shell(cfg, `Tudo certo, ${nome}!`,
        `<p>Seu pagamento do rateio foi <strong>confirmado</strong>. Obrigado!</p><p>Até ${esc(quando(cfg))}. 🥂</p>`, pid) };
    case "comprovante-recebido":
      return { subject: "📄 Comprovante recebido — em análise", html: shell(cfg, `${nome}, recebemos o seu comprovante`,
        `<p>Assim que for confirmado, você recebe o aviso e o selo <strong>✓ pago</strong> aparece no seu painel.</p>`, pid) };
    case "comprovante-tesoureiro":
      return { subject: `💰 Pagamento: ${String(d.nome)} — confira no extrato`, html: shell(cfg, "Entrou um comprovante",
        `<p><strong>${esc(d.nome)}</strong> enviou o comprovante do rateio da Magnum Fest.</p>`, undefined,
        { href: String(d.url), label: "VER COMPROVANTE" }) };
    case "votacao-aberta":
      return { subject: "🗳️ A urna está aberta — vote nos melhores vinhos", html: shell(cfg, `${nome}, a votação começou!`,
        `<p>Um voto por categoria — você pode mudar de ideia enquanto a urna estiver aberta.</p>`, pid,
        { href: `${SITE}votar/`, label: "VOTAR AGORA" }) };
    case "resultados":
      return { subject: "🏆 Saiu o resultado — os melhores vinhos da Magnum Fest", html: shell(cfg, `${nome}, temos vencedores!`,
        `<p>A apuração terminou e os vencedores de cada categoria estão no site.</p>`, pid) };
    case "pedido-garrafa": {
      const zap = String(d.solicitante_zap ?? "").replace(/\D/g, "").replace(/^55/, "");
      return {
        subject: `🤝 ${String(d.solicitante)} quer dividir seu ${String(d.vinho)}`,
        html: shell(cfg, `${nome}, você tem um pedido de sociedade`, `
          <p><strong>${esc(d.solicitante)}</strong> pediu para dividir a sua garrafa de <strong>${vinho}</strong> (${esc(d.formato)}).</p>
          <p style="text-align:center"><a href="https://wa.me/55${zap}" style="background:#2E7D4F;color:#fff;text-decoration:none;padding:12px 26px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px">💬 CHAMAR NO WHATSAPP</a></p>
          <p>Depois de combinar, aceite ou recuse o pedido no seu painel.</p>`, pid),
      };
    }
    case "pedido-aceito":
      return { subject: `🍷 Você está dentro: ${String(d.vinho)}`, html: shell(cfg, `${nome}, sociedade fechada!`,
        `<p>Você agora divide o <strong>${vinho}</strong> (${esc(d.formato)}). 🥂</p>`, pid) };
    case "pedido-recusado":
      return { subject: `Sobre o ${String(d.vinho)}`, html: shell(cfg, `${nome}, esta garrafa não deu certo`,
        `<p>O grupo do <strong>${esc(d.vinho)}</strong> se organizou de outra forma. Que tal registrar uma Magnum sua?</p>`, pid) };
    case "lembrete": {
      const gs = Array.isArray(d.garrafas) ? d.garrafas : [];
      const lista = gs.length
        ? `<p>Suas garrafas:</p><ul>${gs.map((g: any) => `<li><strong>${esc(g.vinho)}${g.safra ? " " + esc(g.safra) : ""}</strong> — ${(SIT[g.situacao] ?? SIT.em_analise)[0]}</li>`).join("")}</ul>`
        : `<p style="color:#8A2A2A"><strong>Você ainda não registrou nenhuma garrafa</strong> — o mínimo é uma Magnum.</p>`;
      const M: Record<string, [string, string]> = {
        "1-mes": ["📅 Falta 1 mês — Magnum Fest Licínio Dias", `${nome}, falta um mês`],
        "1-semana": ["📅 Falta 1 semana — Magnum Fest Licínio Dias", `${nome}, falta só uma semana`],
        "hoje": ["🍷 É HOJE — Magnum Fest Licínio Dias", `${nome}, é hoje! 🥂`],
      };
      const [assunto, titulo] = M[String(d.quando)] ?? M["1-mes"];
      return { subject: assunto, html: shell(cfg, titulo, `<p><strong>${esc(quando(cfg))}</strong> — ${local}.</p>${lista}
        ${cfg.valor_no_dia ? `<p>Valor por pessoa, pago no dia ao restaurante: <strong>${Number(cfg.valor_no_dia).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>.</p>` : ""}`, pid) };
    }
    default:
      return { subject: "Magnum Fest Licínio Dias 2026", html: shell(cfg, "Novidades", "<p>Acesse o site para ver as novidades.</p>", pid) };
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

async function processaFila(cfg: Cfg) {
  const { data: fila } = await sb.from("wlr_emails").select("*").eq("status", "pendente").lt("tentativas", 5)
    .order("criado_em").limit(25);
  let ok = 0, err = 0;
  for (const row of fila ?? []) {
    try {
      const { subject, html } = render(row.tipo, row.dados ?? {}, cfg);
      await enviar(row.para, subject, html);
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
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["identificado", "nome_completo", "produtor", "regiao", "pais", "categoria", "estilo_espumante", "safra",
      "tawny_idade", "puttonyos", "regiao_branco_lista", "nota_rp", "nota_ws", "nota_js", "fontes_notas",
      "preco_eur_750", "preco_eur_formato", "fonte_preco", "premiado", "premios", "origem_controlada", "confianca", "observacoes"],
    properties: {
      identificado: { type: "boolean", description: "true se encontrou este vinho específico (produtor + rótulo + safra)" },
      nome_completo: { type: "string" },
      produtor: str, regiao: str,
      pais: { type: ["string", "null"], description: "Nome do país em português (França, Itália, Estados Unidos…)" },
      categoria: { type: "string", enum: CATEGORIAS },
      estilo_espumante: { type: ["string", "null"], enum: ["Brut", "Rosé", "Outro", null], description: "Só para espumantes" },
      safra: { type: ["integer", "null"] },
      tawny_idade: { type: ["integer", "null"], description: "Idade indicada no rótulo de um Porto Tawny (10, 20, 30, 40)" },
      puttonyos: { type: ["integer", "null"] },
      regiao_branco_lista: { type: ["string", "null"], enum: [...BRANCO_REGIOES_VELHO_MUNDO, null],
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
    const parecer = avaliar(fatos, {
      ano_evento: new Date(cfg.evento_em).getFullYear(),
      litros: Number(g.litros),
      produtor_do_confrade: dono?.produtor_de ?? null,
      vagas: { espumantes: esp.length, espumante_rose: esp.filter((x) => x.subtipo === "Rosé").length,
        doces: (outras ?? []).filter((x) => x.tipo === "Fortificado / Doce").length },
      limites: { espumantes: cfg.lim_espumantes, espumante_rose: cfg.lim_espumante_rose, doces: cfg.lim_doces },
    });
    const analise = { ...parecer, fatos, modelo: MODELO, em: new Date().toISOString(),
      motivo_excecao: g.analise?.motivo_excecao ?? null };
    await sb.from("wlr_garrafas").update({ analise_status: parecer.status, analise, requer_conselho: parecer.requer_conselho,
      analise_em: new Date().toISOString() }).eq("id", g.id);

    // já decidido pelo conselho (ex.: lista importada) → só registra, sem e-mails
    if (!g.decisao) {
      const situacao = parecer.status === "inapto" ? "inapto" : parecer.requer_conselho ? "em_analise" : "aprovado";
      if (dono?.email) {
        await sb.rpc("wlr_email_enqueue", { p_tipo: "parecer", p_para: dono.email, p_dados: {
          nome: dono.nome, participante_id: g.criado_por, vinho: g.vinho, safra: g.safra,
          situacao, resumo: parecer.resumo, criterios: parecer.criterios } });
      }
      if (situacao === "em_analise") {
        const { data: conselho } = await sb.from("wlr_conselho").select("nome, email, token").not("email", "is", null);
        for (const c of conselho ?? []) {
          await sb.rpc("wlr_email_enqueue", { p_tipo: "conselho-avaliar", p_para: c.email, p_dados: {
            conselheiro: c.nome, token: c.token, garrafa_id: g.id, vinho: g.vinho, safra: g.safra,
            confrade: dono?.nome ?? g.sigla ?? "—", motivo: parecer.resumo, criterios: parecer.criterios } });
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

// ── resumo semanal ────────────────────────────────────────────────────────
async function resumoSemanal(cfg: Cfg, apenas?: string) {
  const { data: parts } = await sb.from("wlr_participantes").select("id, nome, email, confirmado_em").eq("confirmado", true);
  const dest = apenas ? (parts ?? []).filter((p) => p.email === apenas) : (parts ?? []);
  const { data: vinhos } = await sb.from("wlr_vinhos_publico").select("*").eq("situacao", "aprovado");
  const semana = Date.now() - 7 * 864e5;
  const novos = (parts ?? []).filter((p) => p.confirmado_em && new Date(p.confirmado_em).getTime() > semana);
  const ordem = ["Espumante", "Branco", "Rosé", "Tinto", "Fortificado / Doce"];
  const porTipo: Record<string, any[]> = {};
  for (const v of vinhos ?? []) (porTipo[v.tipo] ??= []).push(v);
  const carta = Object.keys(porTipo).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).map((t) =>
    `<h3 style="color:#411A39;border-bottom:1px solid #E9DDE3;padding-bottom:6px">${esc(t)}</h3><ul>` +
    porTipo[t].map((v) => `<li><strong>${esc(v.vinho)}${v.safra ? " " + esc(v.safra) : ""}</strong> — ${esc(v.produtor ?? "")}${v.selo?.resumo ? " · " + esc(v.selo.resumo) : ""}</li>`).join("") + "</ul>").join("");
  const corpo = `${novos.length ? `<p style="background:#FBF4F7;border:1px dashed #6C214C;padding:14px">👋 Confirmaram esta semana: ${esc(novos.map((p) => p.nome).join(", "))}</p>` : ""}
    <p>A mesa já tem <strong>${(parts ?? []).length} confrades</strong> e <strong>${(vinhos ?? []).length} vinhos aprovados</strong>.</p>
    <h2 style="font-size:18px;font-weight:normal">A carta até agora</h2>${carta}`;
  let enviados = 0;
  for (const p of dest) {
    if (!p.email) continue;
    try { await enviar(p.email, "🍷 A carta da Magnum Fest — resumo da semana", shell(cfg, `${esc(p.nome.split(" ")[0])}, a mesa está crescendo`, corpo, p.id)); enviados++; }
    catch (_) { /* segue */ }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { enviados };
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-wlr-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const task = body.task ?? "fila";
  const cfg = await carregaCfg();
  try {
    let out: unknown;
    if (task === "resumo-semanal") out = await resumoSemanal(cfg, body.apenas);
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
    return new Response(JSON.stringify({ ok: true, task, out }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), { status: 500 });
  }
});
