// Critérios de seleção da MFLD (Magnum Fest Licínio Dias) — documento "MFLD_2025_Criterios_PT".
// O Claude só levanta os FATOS do vinho (notas, preço, região…); o veredito é esta função,
// determinística, para que a mesma garrafa receba sempre o mesmo parecer.

export const BRANCO_REGIOES_VELHO_MUNDO = [
  "Borgonha", "Bordeaux", "Douro", "Alentejo", "Rioja", "Ribeira Sacra", "Alsácia", "Mosel", "Tokaj", "Rhône",
];
export const BRANCO_PAISES_NOVO_MUNDO = ["Estados Unidos", "África do Sul", "Austrália", "Nova Zelândia"];

export type Fatos = {
  identificado: boolean;
  nome_completo: string;
  produtor: string | null;
  regiao: string | null;
  pais: string | null;
  categoria: "Tinto" | "Branco" | "Rosé" | "Champagne" | "Cava" | "Prosecco" | "Espumante brasileiro" | "Outro espumante"
    | "Porto Vintage" | "Porto Tawny" | "Outro Porto" | "Sauternes" | "Tokaj" | "Outro doce/fortificado";
  estilo_espumante: "Brut" | "Rosé" | "Outro" | null;
  safra: number | null;
  tawny_idade: number | null;
  puttonyos: number | null;
  regiao_branco_lista: string | null;   // uma das regiões da cláusula 5.1, ou null se fora da lista
  nota_rp: number | null; nota_ws: number | null; nota_js: number | null;
  fontes_notas: string | null;
  preco_eur_750: number | null;         // média Wine-Searcher, garrafa 750 ml, sem impostos
  preco_eur_formato: number | null;     // mesma média, no formato levado (ex.: Magnum), se houver
  fonte_preco: string | null;
  premiado: boolean | null;
  premios: string | null;
  origem_controlada: boolean | null;
  confianca: "alta" | "media" | "baixa";
  observacoes: string;
};

export type Criterio = { id: string; rotulo: string; ok: boolean | null; detalhe: string };

export type Parecer = {
  status: "apto" | "conselho" | "inapto";
  requer_conselho: boolean;
  criterios: Criterio[];
  resumo: string;
  publico: { notas: string; preco: string; resumo: string };
};

export type Contexto = {
  ano_evento: number;
  litros: number;
  produtor_do_confrade: string | null;   // cláusula 6.2
  vagas: { espumantes: number; espumante_rose: number; doces: number };   // aprovadas até agora (sem contar esta)
  limites: { espumantes: number; espumante_rose: number; doces: number };
};

const ESPUMANTES = ["Champagne", "Cava", "Prosecco", "Espumante brasileiro", "Outro espumante"];
const DOCES = ["Porto Vintage", "Porto Tawny", "Outro Porto", "Sauternes", "Tokaj", "Outro doce/fortificado"];
const eur = (n: number) => "€ " + Math.round(n).toLocaleString("pt-BR");
const norm = (s: string | null) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function avaliar(f: Fatos, ctx: Contexto): Parecer {
  const c: Criterio[] = [];
  const esp = ESPUMANTES.includes(f.categoria);
  const doce = DOCES.includes(f.categoria);
  const branco = f.categoria === "Branco";

  // 0. É Magnum Fest — mínimo 1,5 L
  c.push({ id: "formato", rotulo: "Formato Magnum ou maior", ok: ctx.litros >= 1.5,
    detalhe: ctx.litros >= 1.5 ? `${ctx.litros.toLocaleString("pt-BR")} L` : `${ctx.litros} L — o mínimo é 1,5 L` });

  // 6.2 — confrade produtor apresenta os próprios vinhos
  const produtorConfrade = !!ctx.produtor_do_confrade && !!f.produtor &&
    (norm(f.produtor).includes(norm(ctx.produtor_do_confrade)) || norm(ctx.produtor_do_confrade).includes(norm(f.produtor)));

  // 1–3. Qualidade: nota ≥ 95 (RP/WS/JS) ou, na falta, preço ≥ € 400
  const notas = [["RP", f.nota_rp], ["WS", f.nota_ws], ["JS", f.nota_js]].filter(([, n]) => n != null) as [string, number][];
  const melhor = notas.reduce<[string, number] | null>((a, b) => (!a || b[1] > a[1] ? b : a), null);
  const notaOk = !!melhor && melhor[1] >= 95;
  const precoRef = f.preco_eur_750;
  const precoOk = precoRef != null && precoRef >= 400;
  const txtNotas = notas.length ? notas.map(([k, n]) => `${k} ${n}`).join(" · ") : "sem nota de RP/WS/JS";
  if (produtorConfrade) {
    c.push({ id: "qualidade", rotulo: "Nota ou preço (cláusulas 1–3)", ok: true,
      detalhe: `Dispensado — vinho do próprio confrade produtor (cláusula 6.2: ${ctx.produtor_do_confrade})` });
  } else if (doce) {
    // Porto, Sauternes e Tokaj seguem a nota; a exceção de preço (3.1) não os cobre
    c.push({ id: "qualidade", rotulo: "Nota mínima 95 (RP, WS ou JS)", ok: notaOk ? true : (notas.length ? false : null),
      detalhe: notaOk ? `${melhor![0]} ${melhor![1]}` : txtNotas });
  } else {
    let ok: boolean | null = notaOk || precoOk;
    if (!ok && !notas.length && precoRef == null) ok = null;   // sem dado nenhum → cláusula 6.1 (conselho)
    const det = notaOk ? `${melhor![0]} ${melhor![1]}` + (precoRef != null ? ` · preço ${eur(precoRef)}` : "")
      : precoOk ? `${txtNotas}, mas preço ${eur(precoRef!)} (≥ € 400, cláusula 3.1)`
      : `${txtNotas}${precoRef != null ? ` · preço ${eur(precoRef)} (abaixo de € 400)` : " · sem preço no Wine-Searcher"}`;
    c.push({ id: "qualidade", rotulo: "Nota ≥ 95 (RP, WS ou JS) ou preço ≥ € 400", ok, detalhe: det });
  }

  // 4. Safras
  if (f.categoria === "Porto Vintage") {
    const lim = ctx.ano_evento - 20;
    c.push({ id: "safra", rotulo: "Porto Vintage com 20 anos ou mais", ok: f.safra == null ? null : f.safra <= lim,
      detalhe: f.safra == null ? "safra não identificada" : `safra ${f.safra} (limite: ${lim})` });
  } else if (f.categoria === "Porto Tawny") {
    c.push({ id: "safra", rotulo: "Porto Tawny de 30 anos ou mais", ok: f.tawny_idade == null ? null : f.tawny_idade >= 30,
      detalhe: f.tawny_idade == null ? "idade não identificada" : `${f.tawny_idade} anos` });
  } else if (f.categoria === "Outro Porto") {
    c.push({ id: "safra", rotulo: "Só Porto Vintage (20+ anos) ou Tawny (30+ anos)", ok: false, detalhe: "outro estilo de Porto" });
  } else if (!branco && !esp && !doce) {
    // o documento de 2025 fixava 2014; a regra anda com o ano da festa (2026 → até 2015)
    const limSafra = ctx.ano_evento - 11;
    c.push({ id: "safra", rotulo: `Safra até ${limSafra}`, ok: f.safra == null ? null : f.safra <= limSafra,
      detalhe: f.safra == null ? "safra não identificada" : `safra ${f.safra}` });
  }

  // 5.1 Brancos — só as regiões da lista
  if (branco) {
    const novoMundo = !!f.pais && BRANCO_PAISES_NOVO_MUNDO.includes(f.pais);
    const ok = !!f.regiao_branco_lista || novoMundo;
    c.push({ id: "regiao", rotulo: "Branco de região aceita (cláusula 5.1)", ok,
      detalhe: ok ? (f.regiao_branco_lista ?? f.pais!) : `${f.regiao ?? "?"}, ${f.pais ?? "?"} — fora da lista` });
  }

  // 5.2–5.6 Espumantes
  if (esp) {
    if (f.categoria === "Champagne") {
      const p = f.preco_eur_750;
      c.push({ id: "champagne-preco", rotulo: "Champagne de € 400 ou mais (cláusula 5.4)", ok: p == null ? null : p >= 400,
        detalhe: p == null ? "sem preço no Wine-Searcher" : `${eur(p)} a garrafa de 750 ml` +
          (f.preco_eur_formato ? ` · ${eur(f.preco_eur_formato)} no formato levado` : "") });
    } else if (["Cava", "Prosecco", "Espumante brasileiro"].includes(f.categoria)) {
      const ok = f.premiado === true && f.safra != null ? true : (f.premiado === false || f.safra == null ? false : null);
      c.push({ id: "espumante", rotulo: `${f.categoria} premiado e safrado (cláusula 5.2)`, ok,
        detalhe: `${f.safra ? "safra " + f.safra : "sem safra"} · ${f.premiado ? (f.premios ?? "premiado") : f.premiado === false ? "sem prêmios" : "prêmios não confirmados"}` });
    } else {
      c.push({ id: "espumante", rotulo: "Espumante: Champagne, ou Cava/Prosecco/brasileiro premiado e safrado", ok: false,
        detalhe: `${f.regiao ?? ""} ${f.pais ?? ""}`.trim() });
    }
    if (f.categoria !== "Champagne") {
      const ok = f.safra != null && f.origem_controlada === true ? true : (f.safra == null || f.origem_controlada === false ? false : null);
      c.push({ id: "doc", rotulo: "Safrado e de origem controlada (cláusula 5.5)", ok,
        detalhe: `${f.safra ? "safra " + f.safra : "sem safra"} · ${f.origem_controlada ? "DO/DOC" : f.origem_controlada === false ? "sem DO" : "DO não confirmada"}` });
    }
    const rose = f.estilo_espumante === "Rosé";
    const lotado = ctx.vagas.espumantes >= ctx.limites.espumantes ||
      (rose ? ctx.vagas.espumante_rose >= ctx.limites.espumante_rose
            : ctx.vagas.espumantes - ctx.vagas.espumante_rose >= ctx.limites.espumantes - ctx.limites.espumante_rose);
    c.push({ id: "vagas", rotulo: `Vaga de espumante ${rose ? "rosé" : "brut"} (cláusula 5.6: 1 rosé + 2 brut)`,
      ok: lotado ? null : true,
      detalhe: `${ctx.vagas.espumantes} de ${ctx.limites.espumantes} vagas ocupadas (${ctx.vagas.espumante_rose} rosé)` +
        (lotado ? " — lotado; o conselho decide entre os candidatos" : "") });
  }

  // 5.7–5.8 Doces e fortificados
  if (f.categoria === "Tokaj") {
    c.push({ id: "tokaj", rotulo: "Tokaj 6 puttonyos (cláusula 5.7)", ok: f.puttonyos == null ? null : f.puttonyos >= 6,
      detalhe: f.puttonyos == null ? "puttonyos não identificados" : `${f.puttonyos} puttonyos` });
  }
  if (f.categoria === "Outro doce/fortificado") {
    c.push({ id: "doce", rotulo: "Doces: só Porto, Sauternes e Tokaj (cláusulas 4.2 e 5.7)", ok: false, detalhe: f.nome_completo });
  }
  if (doce) {
    const lotado = ctx.vagas.doces >= ctx.limites.doces;
    c.push({ id: "vagas", rotulo: "Vaga de Porto/Sauternes/Tokaj (cláusula 5.8: 2 no total)", ok: lotado ? null : true,
      detalhe: `${ctx.vagas.doces} de ${ctx.limites.doces} vagas ocupadas` + (lotado ? " — lotado; o conselho decide" : "") });
  }

  if (!f.identificado) {
    c.push({ id: "identificacao", rotulo: "Vinho identificado com segurança", ok: null, detalhe: f.observacoes || "não encontrei este vinho" });
  }

  const falhou = c.some((x) => x.ok === false);
  const duvida = c.some((x) => x.ok === null);
  const status: Parecer["status"] = falhou ? "inapto" : duvida ? "conselho" : "apto";
  // 7.1: brancos e espumantes sempre passam pelo conselho; doces também (vagas limitadas, Sauternes pela qualidade do produtor)
  const requer_conselho = status === "conselho" || (status === "apto" && (branco || esp || doce));

  const reprovados = c.filter((x) => x.ok === false).map((x) => x.rotulo.toLowerCase());
  const resumo = status === "inapto"
    ? `Não atende: ${reprovados.join("; ")}.`
    : status === "conselho"
      ? "Faltam dados para decidir sozinho — vai para o conselho."
      : requer_conselho
        ? "Atende aos critérios. Brancos, espumantes e doces precisam do aval do conselho (cláusula 7.1)."
        : "Atende a todos os critérios da MFLD.";

  return {
    status, requer_conselho, criterios: c, resumo,
    publico: {
      notas: notas.map(([k, n]) => `${k} ${n}`).join(" · "),
      preco: precoRef != null ? eur(precoRef) : "",
      resumo: status === "inapto" ? "" : (notaOk ? `${melhor![0]} ${melhor![1]}` : precoOk ? `Wine-Searcher ${eur(precoRef!)}` : produtorConfrade ? "Vinho de confrade produtor" : ""),
    },
  };
}
