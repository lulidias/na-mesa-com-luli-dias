/**
 * Luli Dias — Admin Worker
 *
 * Cloudflare Worker que serve dois endpoints:
 *   POST /enrich   — recebe {name, city, country, type} e retorna JSON enriquecido via Claude API
 *   POST /publish  — recebe {country, city, entry, photos[]} e commita no GitHub
 *
 * Autenticação: header X-Admin-Key (compara com secret ADMIN_KEY)
 *
 * Secrets necessários (configurar via dashboard Cloudflare):
 *   - ANTHROPIC_API_KEY  — chave da Claude API
 *   - GITHUB_TOKEN       — Personal Access Token com scope "repo"
 *   - GITHUB_OWNER       — username GitHub (lulidias)
 *   - GITHUB_REPO        — nome do repo (na-mesa-com-luli-dias)
 *   - ADMIN_KEY          — chave compartilhada com Tito/Luli
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Auth check
    const adminKey = request.headers.get('X-Admin-Key');
    if (adminKey !== env.ADMIN_KEY) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/enrich' && request.method === 'POST') {
        return await handleEnrich(request, env);
      }
      if (url.pathname === '/publish' && request.method === 'POST') {
        return await handlePublish(request, env);
      }
      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({ ok: true, version: '1.0' });
      }
    } catch (err) {
      return jsonResponse({ error: err.message, stack: err.stack }, 500);
    }

    return jsonResponse({ error: 'not found' }, 404);
  }
};

// ===================== ENRICH =====================

async function handleEnrich(request, env) {
  const { name, city, country, type } = await request.json();
  if (!name || !city) {
    return jsonResponse({ error: 'name + city required' }, 400);
  }

  const typeLabel = type === 'h' ? 'hotel' : 'restaurante';
  const prompt = `Pesquisa factualmente sobre o ${typeLabel} "${name}" em ${city}${country ? `, ${country}` : ''}.

Retorna APENAS um JSON válido (nenhum texto antes ou depois) com os campos abaixo. OMITE campos que não souberes — não inventes.

{
  "q": "Categoria curta no estilo do guia. Exemplos: 'Parrilla Uruguaia', 'Italiana de Autor', 'Hotel 5★ Luxury Collection · Frente à Stazione'",
  "a": "Endereço completo: Rua, número, bairro, cidade",
  "p": "Telefone com código país no formato '+XX XXXX XXXX'",
  "w": "Website principal SEM https:// (ex: 'paradorlahuella.com')",
  "ig": "Username Instagram SEM @ (ex: 'paradorlahuella')",
  "e": "Email principal de reservas se conhecido",
  "pr": 1|2|3|4 (1=económico, 2=médio, 3=caro, 4=luxo),
  "m": "m1"|"m2"|"m3"|"bib"|"green"|"rec" (distinção Michelin) ou omite,
  "s": 3|4|5 (estrelas, SÓ se for hotel),
  "k": 1|2|3 (chaves Michelin, SÓ se for hotel reconhecido),
  "note": "Distinção principal curta. Exemplos: '1 Estrela Michelin', 'Latin America's 50 Best 2024 #41', 'Beach Club · Frente ao Conrad'",
  "d": "Descrição em PT europeu, 2-4 frases, tom curador (não publicitário). Menciona pratos icónicos, chef se relevante, contexto histórico se interessante. Estilo: elegante, conhecedor, factual.",
  "lat": número decimal,
  "lng": número decimal
}

Estilo da descrição (segue este tom):
- "O restaurante mais famoso do Uruguai, em José Ignacio. Peixe e marisco frescos grelhados na brasa com vista para o Atlântico numa casa de palha icónica. Frequentado por atores, modelos e celebridades internacionais."
- "Hotel cinco-estrelas Grand Hyatt em Wan Chai com vista panorâmica para a Victoria Harbour. 542 quartos, restaurante One Harbour Road (cantonês), Plateau spa, piscina exterior aquecida."

NÃO incluas:
- Hype publicitário ("o melhor!", "imperdível!")
- Linguagem de TripAdvisor
- Estrelas/avaliações genéricas
- Aspas duplas dentro dos valores (escapa-as ou usa aspas simples)`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return jsonResponse({ error: 'anthropic api error', status: response.status, detail }, 500);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Extract JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return jsonResponse({ error: 'no json in response', text }, 500);
  }

  let enriched;
  try {
    enriched = JSON.parse(jsonMatch[0]);
  } catch (e) {
    return jsonResponse({ error: 'invalid json from claude', text, parseError: e.message }, 500);
  }

  return jsonResponse(enriched);
}

// ===================== PUBLISH =====================

async function handlePublish(request, env) {
  const { country, city, entry, photos } = await request.json();
  if (!country || !city || !entry || !entry.n) {
    return jsonResponse({ error: 'country + city + entry.n required' }, 400);
  }

  // Determine guide file path
  const guideFile = country.startsWith('brasil-') ? `${country}.html` : `${country}-guia.html`;
  const folder = country.startsWith('brasil-') ? 'brasil' : country;

  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const ghApi = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const ghHeaders = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'luli-admin-worker',
    'Accept': 'application/vnd.github.v3+json',
  };

  // 1. Get current guide
  const guideRes = await fetch(`${ghApi}/${guideFile}`, { headers: ghHeaders });
  if (!guideRes.ok) {
    return jsonResponse({ error: 'failed to fetch guide', file: guideFile, status: guideRes.status }, 500);
  }
  const guideData = await guideRes.json();
  const currentContent = atob(guideData.content.replace(/\s/g, ''));

  // 2. Add entry to HTML
  let updatedContent;
  try {
    updatedContent = addEntryToGuide(currentContent, city, entry, country, folder);
  } catch (e) {
    return jsonResponse({ error: 'failed to modify guide', detail: e.message }, 500);
  }

  // 3. Commit guide update
  const commitMsg = `Admin: +${entry.n} · ${city} (curador: ${entry.c || 'luli'})`;
  const updateRes = await fetch(`${ghApi}/${guideFile}`, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMsg,
      content: utf8ToBase64(updatedContent),
      sha: guideData.sha,
    })
  });

  if (!updateRes.ok) {
    const detail = await updateRes.text();
    return jsonResponse({ error: 'failed to commit guide', detail }, 500);
  }

  // 4. Upload photos
  const photoResults = [];
  for (const photo of photos || []) {
    const photoPath = `fotos/${folder}/${photo.filename}`;
    // Check if exists (overwrite if so)
    const existRes = await fetch(`${ghApi}/${photoPath}`, { headers: ghHeaders });
    const existSha = existRes.ok ? (await existRes.json()).sha : undefined;

    const body = {
      message: `Admin: foto ${photo.filename}`,
      content: photo.base64,
    };
    if (existSha) body.sha = existSha;

    const photoRes = await fetch(`${ghApi}/${photoPath}`, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    photoResults.push({
      filename: photo.filename,
      ok: photoRes.ok,
      status: photoRes.status,
      ...(photoRes.ok ? {} : { error: await photoRes.text() })
    });
  }

  return jsonResponse({
    success: true,
    entry: entry.n,
    file: guideFile,
    commit: commitMsg,
    photos: photoResults,
  });
}

// ===================== HTML MUTATION =====================
// Usa manipulação textual em vez de parsing JSON para suportar
// guias com aspas mistas (ex: portugal-guia.html) que usam single quotes.

function addEntryToGuide(content, cityName, entry, countryKey, folder) {
  // Find CITIES const
  const citiesMatch = content.match(/(const\s+CITIES\s*=\s*)(\[[\s\S]*?\])(\s*;)/);
  if (!citiesMatch) throw new Error('CITIES not found in guide');

  // Extract lat/lng for COORDS update
  const lat = entry.lat;
  const lng = entry.lng;
  const slug = slugify(entry.n);
  const cleanEntry = { ...entry };
  delete cleanEntry.lat;
  delete cleanEntry.lng;

  const entryJson = JSON.stringify(cleanEntry);
  const citiesStartIdx = citiesMatch.index + citiesMatch[1].length;
  const citiesEndIdx = citiesStartIdx + citiesMatch[2].length;
  const citiesText = citiesMatch[2]; // [...]

  let newCitiesText;

  // Try to find existing city — match `city`/`"city"`/`'city'` followed by the cityName in any quote style
  const escName = cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cityRegex = new RegExp(
    `["']?city["']?\\s*:\\s*["']${escName}["']`,
    'i'
  );
  const cityMatch = citiesText.match(cityRegex);

  if (cityMatch) {
    // Find entries:[...] inside this city object
    const fromCity = citiesText.slice(cityMatch.index);
    const entriesMatch = fromCity.match(/["']?entries["']?\s*:\s*\[/);
    if (entriesMatch) {
      const entriesOpenIdx = cityMatch.index + entriesMatch.index + entriesMatch[0].length;
      // Walk forward respecting nested brackets and strings
      const closeIdx = findMatchingBracket(citiesText, entriesOpenIdx, '[', ']');
      if (closeIdx !== -1) {
        const inside = citiesText.slice(entriesOpenIdx, closeIdx).trim();
        const sep = inside ? ',' : '';
        newCitiesText = citiesText.slice(0, closeIdx) + sep + entryJson + citiesText.slice(closeIdx);
      } else {
        throw new Error('Could not find closing bracket of entries array');
      }
    } else {
      throw new Error('Found city but no entries array inside');
    }
  } else {
    // City não existe — adicionar nova city
    const newCity = { city: cityName, region: cityName, entries: [cleanEntry] };
    const newCityJson = JSON.stringify(newCity);
    const closeBracketIdx = citiesText.lastIndexOf(']');
    if (closeBracketIdx === -1) throw new Error('CITIES array malformed');
    const inside = citiesText.slice(1, closeBracketIdx).trim();
    const sep = inside ? ',' : '';
    newCitiesText = citiesText.slice(0, closeBracketIdx) + sep + newCityJson + citiesText.slice(closeBracketIdx);
  }

  let newContent = content.slice(0, citiesStartIdx) + newCitiesText + content.slice(citiesEndIdx);

  // ============ COORDS update ============
  if (lat && lng) {
    const coordsMatch = newContent.match(/(const\s+COORDS\s*=\s*)(\{[\s\S]*?\})(\s*;)/);
    if (coordsMatch) {
      const coordsStartIdx = coordsMatch.index + coordsMatch[1].length;
      const coordsText = coordsMatch[2]; // {...}
      const coordEntry = JSON.stringify({
        name: entry.n,
        address: entry.a || '',
        country: folder,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });
      const coordKey = `"${folder}/${slug}"`;
      const closeBraceIdx = coordsText.lastIndexOf('}');
      if (closeBraceIdx !== -1) {
        const inside = coordsText.slice(1, closeBraceIdx).trim();
        const sep = inside ? ',' : '';
        const newCoordsText = coordsText.slice(0, closeBraceIdx) + sep + coordKey + ':' + coordEntry + coordsText.slice(closeBraceIdx);
        newContent = newContent.slice(0, coordsStartIdx) + newCoordsText + newContent.slice(coordsStartIdx + coordsText.length);
      }
    }
  }

  return newContent;
}

// Walk forward through `text` from `startIdx` to find matching close bracket.
// Respects strings (both " and ') and nested brackets.
function findMatchingBracket(text, startIdx, openCh, closeCh) {
  let depth = 1;
  let i = startIdx;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      // Skip string
      const quote = ch;
      i++;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') i++; // skip escaped chars
        i++;
      }
      i++;
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) depth--;
    if (depth === 0) return i;
    i++;
  }
  return -1;
}

// ===================== UTILS =====================

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function utf8ToBase64(str) {
  // Cloudflare Workers expose btoa but not for non-Latin1
  return btoa(unescape(encodeURIComponent(str)));
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}
