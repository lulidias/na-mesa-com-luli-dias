// Leitura do rótulo pela foto do confrade + foto padrão (catálogo do Vivino) do vinho exato.
// A foto do confrade serve só para ler o rótulo e fica guardada como comprovante; na carta aparece a foto padrão.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODELO_VISAO = "claude-opus-5";
const TIPOS = ["Tinto", "Branco", "Espumante", "Rosé", "Fortificado / Doce"];

export type Leitura = {
  legivel: boolean; produtor: string | null; vinho: string | null; safra: string | null;
  tipo: string | null; subtipo: string | null; regiao: string | null; pais: string | null;
  formato: string | null; observacao: string | null;
};
export type Candidato = { id: number; nome: string; produtor: string; regiao: string | null; pais: string | null; foto: string | null };

const FERRAMENTA_ROTULO = {
  name: "registrar_rotulo",
  description: "Registra exatamente o que está escrito no rótulo da garrafa.",
  input_schema: {
    type: "object",
    required: ["legivel", "produtor", "vinho", "safra", "tipo", "subtipo", "regiao", "pais", "formato", "observacao"],
    properties: {
      legivel: { type: "boolean", description: "false se a foto não permite ler o rótulo com segurança" },
      produtor: { type: ["string", "null"], description: "Produtor/casa/château, como no rótulo (ex.: Henri Giraud, Château Latour)" },
      vinho: { type: ["string", "null"], description: "Nome do vinho/cuvée SEM repetir o produtor e SEM a safra (ex.: Fût de Chêne Aÿ Grand Cru Brut, Grand Vin, Insignia). Inclua a designação que diferencia o rótulo (Grand Cru, Reserva, Blanc de Blancs…)." },
      safra: { type: ["string", "null"], description: "Ano da safra (ex.: 2015). Se não for safrado, o que o rótulo mostrar: 'MV19' (multi-vintage base 2019), 'NV', 'Edition 19'. null se não aparecer." },
      tipo: { anyOf: [{ type: "string", enum: TIPOS }, { type: "null" }] },
      subtipo: { type: ["string", "null"], description: "Espumante: 'Brut' ou 'Rosé'. Fortificado/doce: 'Porto Vintage', 'Porto Tawny', 'Sauternes', 'Tokaj' ou 'Outro'. Senão null." },
      regiao: { type: ["string", "null"], description: "Região/apelação do rótulo (ex.: Champagne, Pauillac, Rioja)" },
      pais: { type: ["string", "null"], description: "País em português (França, Itália, Espanha, Portugal, Estados Unidos…)" },
      formato: { type: ["string", "null"], description: "Formato se visível: 'Magnum', '750 ml', 'Jéroboam'… senão null" },
      observacao: { type: ["string", "null"], description: "Qualquer detalhe que ajude a distinguir de rótulos parecidos do mesmo produtor" },
    },
  },
};

async function comFerramenta(client: Anthropic, params: any, nome: string) {
  const r = await client.messages.create({ model: MODELO_VISAO, max_tokens: 2000, tool_choice: { type: "tool", name: nome }, ...params } as any);
  const uso = (r.content as any[]).find((b) => b.type === "tool_use" && b.name === nome);
  if (!uso) throw new Error("Não foi possível ler o rótulo");
  return uso.input;
}

export async function leRotulo(img: { base64: string; tipo: string }): Promise<Leitura> {
  const client = new Anthropic();
  return await comFerramenta(client, {
    tools: [FERRAMENTA_ROTULO],
    system: "Você lê rótulos de vinho em fotos tiradas por confrades de uma confraria. Transcreva com precisão o que está escrito — não complete com o que você acha que deveria ser. Diferencie cuvées do mesmo produtor pelo que está no rótulo.",
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: img.tipo, data: img.base64 } },
      { type: "text", text: "Leia o rótulo desta garrafa e registre com registrar_rotulo." },
    ] }],
  }, "registrar_rotulo") as Leitura;
}

// catálogo do Vivino (o mesmo índice que o site usa na busca)
export async function vivino(q: string): Promise<Candidato[]> {
  const r = await fetch("https://9takgwjuxl-dsn.algolia.net/1/indexes/WINES_prod/query?x-algolia-application-id=9TAKGWJUXL&x-algolia-api-key=60c11b2f1068885161d95ca068d3a6ae", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: "query=" + encodeURIComponent(q) + "&hitsPerPage=10" }),
  });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.hits ?? []).map((h: any) => {
    const b = h.image?.variations?.bottle_large ?? null;
    return { id: h.id, nome: h.name, produtor: h.winery?.name ?? "", regiao: h.region?.name ?? null, pais: h.region?.country?.name ?? null,
      foto: b ? "https:" + String(b).replace(/_pb_x\d+\./, "_pb_x600.") : null };
  });
}

// qual candidato é EXATAMENTE o vinho do rótulo (mesmo produtor e mesma cuvée) — senão nenhum
export async function escolhe(v: { produtor: string | null; vinho: string | null; regiao?: string | null; observacao?: string | null }, cands: Candidato[]): Promise<Candidato | null> {
  if (!cands.length) return null;
  const client = new Anthropic();
  const r = await comFerramenta(client, {
    tools: [{ name: "escolher", description: "Indica o candidato que é o mesmo vinho.", input_schema: { type: "object", required: ["id"],
      properties: { id: { type: ["integer", "null"], description: "id do candidato que é exatamente o mesmo vinho (mesmo produtor e mesma cuvée); null se nenhum for" } } } }],
    system: "Você compara um vinho com uma lista do catálogo do Vivino. Só escolha um candidato se for o MESMO rótulo: mesmo produtor e mesma cuvée. Outra cuvée do mesmo produtor (ex.: 'Esprit' em vez de 'Fût de Chêne') NÃO serve — responda null.",
    messages: [{ role: "user", content: `Vinho: ${v.produtor ?? ""} — ${v.vinho ?? ""}${v.regiao ? " (" + v.regiao + ")" : ""}${v.observacao ? "\nDetalhes: " + v.observacao : ""}\n\nCandidatos:\n` +
      cands.map((c) => `${c.id}: ${c.produtor} — ${c.nome}${c.regiao ? " (" + c.regiao + ")" : ""}`).join("\n") }],
  }, "escolher") as { id: number | null };
  return cands.find((c) => c.id === r.id) ?? null;
}

// foto padrão para um vinho: só a do rótulo exato; sem foto de garrafa no Vivino → null (o conselho põe uma)
export async function fotoPadrao(v: { produtor: string | null; vinho: string | null; regiao?: string | null; observacao?: string | null }) {
  const q = [v.produtor, v.vinho].filter(Boolean).join(" ");
  if (!q.trim()) return { candidato: null as Candidato | null, foto: null as string | null };
  const c = await escolhe(v, await vivino(q));
  return { candidato: c, foto: c?.foto ?? null };
}
