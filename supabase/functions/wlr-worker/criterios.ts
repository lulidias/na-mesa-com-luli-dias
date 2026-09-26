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
  observacoes_es?: string;
  observacoes_en?: string;
};

export type Criterio = { id: string; rotulo: string; ok: boolean | null; detalhe: string };

export type Parecer = {
  status: "apto" | "conselho" | "inapto";
  requer_conselho: boolean;
  criterios: Criterio[];
  resumo: string;
  publico: { notas: string; preco: string; resumo: string; resumo_es?: string; resumo_en?: string };
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

export type Idioma = "pt" | "es" | "en";

export function avaliar(f: Fatos, ctx: Contexto, lang: Idioma = "pt"): Parecer {
  const x = (pt: string, es: string, en: string) => (lang === "es" ? es : lang === "en" ? en : pt);
  const c: Criterio[] = [];
  const esp = ESPUMANTES.includes(f.categoria);
  const doce = DOCES.includes(f.categoria);
  const branco = f.categoria === "Branco";
  const loc = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-GB";
  const safraTxt = (n: number | null) => n == null ? x("sem safra", "sin añada", "no vintage") : x("safra ", "añada ", "vintage ") + n;

  // 0. É Magnum Fest — mínimo 1,5 L
  c.push({ id: "formato", rotulo: x("Formato Magnum ou maior", "Formato Magnum o mayor", "Magnum format or larger"), ok: ctx.litros >= 1.5,
    detalhe: ctx.litros >= 1.5 ? `${ctx.litros.toLocaleString(loc)} L` : `${ctx.litros} L — ${x("o mínimo é 1,5 L", "el mínimo es 1,5 L", "the minimum is 1.5 L")}` });

  // 6.2 — confrade produtor apresenta os próprios vinhos
  const produtorConfrade = !!ctx.produtor_do_confrade && !!f.produtor &&
    (norm(f.produtor).includes(norm(ctx.produtor_do_confrade)) || norm(ctx.produtor_do_confrade).includes(norm(f.produtor)));

  // 1–3. Qualidade: nota ≥ 95 (RP/WS/JS) ou, na falta, preço ≥ € 400
  const notas = [["RP", f.nota_rp], ["WS", f.nota_ws], ["JS", f.nota_js]].filter(([, n]) => n != null) as [string, number][];
  const melhor = notas.reduce<[string, number] | null>((a, b) => (!a || b[1] > a[1] ? b : a), null);
  const notaOk = !!melhor && melhor[1] >= 95;
  // a Magnum Fest só aceita Magnum: os € 400 valem para o preço da Magnum (regra confirmada pelo Luli em 27/09).
  // Sem cotação da Magnum, estima-se 2,1 × a garrafa de 750 ml.
  const precoRef = f.preco_eur_formato ?? (f.preco_eur_750 != null ? Math.round(f.preco_eur_750 * 2.1) : null);
  const precoOk = precoRef != null && precoRef >= 400;
  const txtNotas = notas.length ? notas.map(([k, n]) => `${k} ${n}`).join(" · ") : x("sem nota de RP/WS/JS", "sin puntuación de RP/WS/JS", "no RP/WS/JS score");
  const preco = x("preço", "precio", "price");
  if (produtorConfrade) {
    c.push({ id: "qualidade", rotulo: x("Nota ou preço (cláusulas 1–3)", "Puntuación o precio (cláusulas 1–3)", "Score or price (clauses 1–3)"), ok: true,
      detalhe: x("Dispensado — vinho do próprio confrade produtor", "No se exige: vino del propio cofrade productor", "Waived — the member's own wine") + ` (${x("cláusula", "cláusula", "clause")} 6.2: ${ctx.produtor_do_confrade})` });
  } else if (doce) {
    // Porto, Sauternes e Tokaj seguem a nota; a exceção de preço (3.1) não os cobre
    c.push({ id: "qualidade", rotulo: x("Nota mínima 95 (RP, WS ou JS)", "Puntuación mínima 95 (RP, WS o JS)", "Minimum score 95 (RP, WS or JS)"), ok: notaOk ? true : (notas.length ? false : null),
      detalhe: notaOk ? `${melhor![0]} ${melhor![1]}` : txtNotas });
  } else {
    let ok: boolean | null = notaOk || precoOk;
    if (!ok && !notas.length && precoRef == null) ok = null;   // sem dado nenhum → cláusula 6.1 (conselho)
    const det = notaOk ? `${melhor![0]} ${melhor![1]}` + (precoRef != null ? ` · ${preco} ${eur(precoRef)}` : "")
      : precoOk ? `${txtNotas}${x(", mas preço ", ", pero precio ", ", but price ")}${eur(precoRef!)} (≥ € 400, ${x("cláusula", "cláusula", "clause")} 3.1)`
      : `${txtNotas}${precoRef != null ? ` · ${preco} Magnum ${eur(precoRef)} (${x("abaixo de € 400", "por debajo de 400 €", "below €400")})` : " · " + x("sem preço no Wine-Searcher", "sin precio en Wine-Searcher", "no Wine-Searcher price")}` +
        (f.preco_eur_750 != null ? ` · 750 ml ${eur(f.preco_eur_750)}` : "");
    c.push({ id: "qualidade", rotulo: x("Nota ≥ 95 (RP, WS ou JS) ou preço ≥ € 400", "Puntuación ≥ 95 (RP, WS o JS) o precio ≥ 400 €", "Score ≥ 95 (RP, WS or JS) or price ≥ €400"), ok, detalhe: det });
  }

  // 4. Safras
  if (f.categoria === "Porto Vintage") {
    const lim = ctx.ano_evento - 20;
    c.push({ id: "safra", rotulo: x("Porto Vintage com 20 anos ou mais", "Oporto Vintage con 20 años o más", "Vintage Port 20+ years old"), ok: f.safra == null ? null : f.safra <= lim,
      detalhe: f.safra == null ? x("safra não identificada", "añada no identificada", "vintage not identified") : `${safraTxt(f.safra)} (${x("limite", "límite", "limit")}: ${lim})` });
  } else if (f.categoria === "Porto Tawny") {
    c.push({ id: "safra", rotulo: x("Porto Tawny de 30 anos ou mais", "Oporto Tawny de 30 años o más", "Tawny Port 30+ years"), ok: f.tawny_idade == null ? null : f.tawny_idade >= 30,
      detalhe: f.tawny_idade == null ? x("idade não identificada", "edad no identificada", "age not identified") : `${f.tawny_idade} ${x("anos", "años", "years")}` });
  } else if (f.categoria === "Outro Porto") {
    c.push({ id: "safra", rotulo: x("Só Porto Vintage (20+ anos) ou Tawny (30+ anos)", "Solo Oporto Vintage (20+ años) o Tawny (30+ años)", "Only Vintage Port (20+ years) or Tawny (30+ years)"), ok: false,
      detalhe: x("outro estilo de Porto", "otro estilo de Oporto", "another style of Port") });
  } else if (!branco && !esp && !doce) {
    // o documento de 2025 fixava 2014; a regra anda com o ano da festa (2026 → até 2015)
    const limSafra = ctx.ano_evento - 11;
    c.push({ id: "safra", rotulo: x(`Safra até ${limSafra}`, `Añada hasta ${limSafra}`, `Vintage ${limSafra} or older`), ok: f.safra == null ? null : f.safra <= limSafra,
      detalhe: f.safra == null ? x("safra não identificada", "añada no identificada", "vintage not identified") : safraTxt(f.safra) });
  }

  // 5.1 Brancos — só as regiões da lista
  if (branco) {
    const novoMundo = !!f.pais && BRANCO_PAISES_NOVO_MUNDO.includes(f.pais);
    const ok = !!f.regiao_branco_lista || novoMundo;
    c.push({ id: "regiao", rotulo: x("Branco de região aceita (cláusula 5.1)", "Blanco de región aceptada (cláusula 5.1)", "White from an accepted region (clause 5.1)"), ok,
      detalhe: ok ? (f.regiao_branco_lista ?? f.pais!) : `${f.regiao ?? "?"}, ${f.pais ?? "?"} — ${x("fora da lista", "fuera de la lista", "not on the list")}` });
  }

  // 5.2–5.6 Espumantes
  if (esp) {
    if (f.categoria === "Champagne") {
      const p = precoRef;
      c.push({ id: "champagne-preco", rotulo: x("Champagne de € 400 ou mais (cláusula 5.4)", "Champagne de 400 € o más (cláusula 5.4)", "Champagne at €400 or more (clause 5.4)"), ok: p == null ? null : p >= 400,
        detalhe: p == null ? x("sem preço no Wine-Searcher", "sin precio en Wine-Searcher", "no Wine-Searcher price") : `${eur(p)} ${x("a Magnum", "la Magnum", "per Magnum")}` +
          (f.preco_eur_750 != null ? ` · 750 ml ${eur(f.preco_eur_750)}` : "") });
    } else if (["Cava", "Prosecco", "Espumante brasileiro"].includes(f.categoria)) {
      const ok = f.premiado === true && f.safra != null ? true : (f.premiado === false || f.safra == null ? false : null);
      c.push({ id: "espumante", rotulo: x(`${f.categoria} premiado e safrado (cláusula 5.2)`, `${f.categoria === "Espumante brasileiro" ? "Espumoso brasileño" : f.categoria} premiado y de añada (cláusula 5.2)`, `Award-winning, vintage-dated ${f.categoria === "Espumante brasileiro" ? "Brazilian sparkling" : f.categoria} (clause 5.2)`), ok,
        detalhe: `${safraTxt(f.safra)} · ${f.premiado ? (f.premios ?? x("premiado", "premiado", "award-winning")) : f.premiado === false ? x("sem prêmios", "sin premios", "no awards") : x("prêmios não confirmados", "premios no confirmados", "awards not confirmed")}` });
    } else {
      c.push({ id: "espumante", rotulo: x("Espumante: Champagne, ou Cava/Prosecco/brasileiro premiado e safrado", "Espumoso: Champagne, o Cava/Prosecco/brasileño premiado y de añada", "Sparkling: Champagne, or award-winning vintage Cava/Prosecco/Brazilian"), ok: false,
        detalhe: `${f.regiao ?? ""} ${f.pais ?? ""}`.trim() });
    }
    if (f.categoria !== "Champagne") {
      const ok = f.safra != null && f.origem_controlada === true ? true : (f.safra == null || f.origem_controlada === false ? false : null);
      c.push({ id: "doc", rotulo: x("Safrado e de origem controlada (cláusula 5.5)", "De añada y con denominación de origen (cláusula 5.5)", "Vintage-dated, controlled appellation (clause 5.5)"), ok,
        detalhe: `${safraTxt(f.safra)} · ${f.origem_controlada ? "DO/DOC" : f.origem_controlada === false ? x("sem DO", "sin DO", "no appellation") : x("DO não confirmada", "DO no confirmada", "appellation not confirmed")}` });
    }
    const rose = f.estilo_espumante === "Rosé";
    const lotado = ctx.vagas.espumantes >= ctx.limites.espumantes ||
      (rose ? ctx.vagas.espumante_rose >= ctx.limites.espumante_rose
            : ctx.vagas.espumantes - ctx.vagas.espumante_rose >= ctx.limites.espumantes - ctx.limites.espumante_rose);
    c.push({ id: "vagas", rotulo: x(`Vaga de espumante ${rose ? "rosé" : "brut"} (cláusula 5.6: 1 rosé + 2 brut)`, `Plaza de espumoso ${rose ? "rosado" : "brut"} (cláusula 5.6: 1 rosado + 2 brut)`, `${rose ? "Rosé" : "Brut"} sparkling slot (clause 5.6: 1 rosé + 2 brut)`),
      ok: lotado ? null : true,
      detalhe: x(`${ctx.vagas.espumantes} de ${ctx.limites.espumantes} vagas ocupadas (${ctx.vagas.espumante_rose} rosé)`, `${ctx.vagas.espumantes} de ${ctx.limites.espumantes} plazas ocupadas (${ctx.vagas.espumante_rose} rosado)`, `${ctx.vagas.espumantes} of ${ctx.limites.espumantes} slots taken (${ctx.vagas.espumante_rose} rosé)`) +
        (lotado ? x(" — lotado; o conselho decide entre os candidatos", ": completo; el consejo decide entre los candidatos", " — full; the board chooses among the candidates") : "") });
  }

  // 5.7–5.8 Doces e fortificados
  if (f.categoria === "Tokaj") {
    c.push({ id: "tokaj", rotulo: x("Tokaj 6 puttonyos (cláusula 5.7)", "Tokaj 6 puttonyos (cláusula 5.7)", "Tokaj 6 puttonyos (clause 5.7)"), ok: f.puttonyos == null ? null : f.puttonyos >= 6,
      detalhe: f.puttonyos == null ? x("puttonyos não identificados", "puttonyos no identificados", "puttonyos not identified") : `${f.puttonyos} puttonyos` });
  }
  if (f.categoria === "Outro doce/fortificado") {
    c.push({ id: "doce", rotulo: x("Doces: só Porto, Sauternes e Tokaj (cláusulas 4.2 e 5.7)", "Dulces: solo Oporto, Sauternes y Tokaj (cláusulas 4.2 y 5.7)", "Sweet wines: only Port, Sauternes and Tokaj (clauses 4.2 and 5.7)"), ok: false, detalhe: f.nome_completo });
  }
  if (doce) {
    const lotado = ctx.vagas.doces >= ctx.limites.doces;
    c.push({ id: "vagas", rotulo: x("Vaga de Porto/Sauternes/Tokaj (cláusula 5.8: 2 no total)", "Plaza de Oporto/Sauternes/Tokaj (cláusula 5.8: 2 en total)", "Port/Sauternes/Tokaj slot (clause 5.8: 2 in total)"), ok: lotado ? null : true,
      detalhe: x(`${ctx.vagas.doces} de ${ctx.limites.doces} vagas ocupadas`, `${ctx.vagas.doces} de ${ctx.limites.doces} plazas ocupadas`, `${ctx.vagas.doces} of ${ctx.limites.doces} slots taken`) +
        (lotado ? x(" — lotado; o conselho decide", ": completo; decide el consejo", " — full; the board decides") : "") });
  }

  if (!f.identificado) {
    const obs = lang === "es" ? f.observacoes_es : lang === "en" ? f.observacoes_en : f.observacoes;
    c.push({ id: "identificacao", rotulo: x("Vinho identificado com segurança", "Vino identificado con seguridad", "Wine positively identified"), ok: null,
      detalhe: obs || x("não encontrei este vinho", "no encontré este vino", "could not find this wine") });
  }

  const falhou = c.some((y) => y.ok === false);
  const duvida = c.some((y) => y.ok === null);
  const status: Parecer["status"] = falhou ? "inapto" : duvida ? "conselho" : "apto";
  // 7.1: brancos e espumantes sempre passam pelo conselho; doces também (vagas limitadas, Sauternes pela qualidade do produtor)
  const requer_conselho = status === "conselho" || (status === "apto" && (branco || esp || doce));

  const reprovados = c.filter((y) => y.ok === false).map((y) => y.rotulo.toLowerCase());
  const resumo = status === "inapto"
    ? x("Não atende: ", "No cumple: ", "Does not meet: ") + reprovados.join("; ") + "."
    : status === "conselho"
      ? x("Faltam dados para decidir sozinho — vai para o conselho.", "Faltan datos para decidir automáticamente: pasa al consejo.", "Not enough data to decide automatically — it goes to the board.")
      : requer_conselho
        ? x("Atende aos critérios. Brancos, espumantes e doces precisam do aval do conselho (cláusula 7.1).", "Cumple los criterios. Blancos, espumosos y dulces necesitan el visto bueno del consejo (cláusula 7.1).", "Meets the criteria. Whites, sparkling and sweet wines need the board's approval (clause 7.1).")
        : x("Atende a todos os critérios da MFLD.", "Cumple todos los criterios de la MFLD.", "Meets all MFLD criteria.");

  return {
    status, requer_conselho, criterios: c, resumo,
    publico: {
      notas: notas.map(([k, n]) => `${k} ${n}`).join(" · "),
      preco: precoRef != null ? eur(precoRef) : "",
      resumo: status === "inapto" ? "" : (notaOk ? `${melhor![0]} ${melhor![1]}` : produtorConfrade ? x("Vinho de confrade produtor", "Vino de cofrade productor", "A member's own wine") : ""),
    },
  };
}
