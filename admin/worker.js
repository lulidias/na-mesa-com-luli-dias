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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      if (url.pathname === '/create-country' && request.method === 'POST') {
        return await handleCreateCountry(request, env);
      }
      if (url.pathname === '/analytics' && request.method === 'GET') {
        return await handleAnalytics(url, env);
      }
      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({ ok: true, version: '1.2' });
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
  const currentContent = base64ToUtf8(guideData.content);

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
  // STAGING — new entries enter pending state by default; admin flips them visible later
  if (cleanEntry.pending === undefined) cleanEntry.pending = true;

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

// ===================== CREATE COUNTRY =====================

async function handleCreateCountry(request, env) {
  const { name, flag, cities, region } = await request.json();
  if (!name || !flag) {
    return jsonResponse({ error: 'name + flag required' }, 400);
  }

  const key = slugify(name);
  if (!key) return jsonResponse({ error: 'invalid name' }, 400);

  const guideFile = `${key}-guia.html`;
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const ghApi = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const ghHeaders = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'luli-admin-worker',
    'Accept': 'application/vnd.github.v3+json',
  };

  // 1. Check if country already exists
  const existsRes = await fetch(`${ghApi}/${guideFile}`, { headers: ghHeaders });
  if (existsRes.ok) {
    return jsonResponse({ error: 'country already exists', file: guideFile }, 409);
  }

  // 2. Get template
  const tplRes = await fetch(`${ghApi}/admin/country-template.html`, { headers: ghHeaders });
  if (!tplRes.ok) {
    return jsonResponse({ error: 'template not found' }, 500);
  }
  const tplData = await tplRes.json();
  const template = base64ToUtf8(tplData.content);

  // 3. Replace placeholders
  const guideContent = template
    .replace(/\{\{COUNTRY_NAME\}\}/g, name)
    .replace(/\{\{COUNTRY_KEY\}\}/g, key)
    .replace(/\{\{COUNTRY_CITIES\}\}/g, cities || name);

  // 4. Commit guide file
  const commitMsg = `Admin: novo país ${flag} ${name}`;
  const createRes = await fetch(`${ghApi}/${guideFile}`, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMsg,
      content: utf8ToBase64(guideContent),
    })
  });
  if (!createRes.ok) {
    return jsonResponse({ error: 'failed to create guide', detail: await createRes.text() }, 500);
  }

  // 5. Update index.html — add to countries array
  const indexRes = await fetch(`${ghApi}/index.html`, { headers: ghHeaders });
  if (indexRes.ok) {
    const indexData = await indexRes.json();
    let indexContent = base64ToUtf8(indexData.content);

    const newCountryEntry = `      { name:'${name}', flag:'${flag}', region:'${region || 'Internacional'}', cities:'${cities || name}', restaurants:0, michelin:0, hotels:0, file:'${guideFile}', photo:'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop' },\n`;

    // Insert before the closing ] of any region's countries array
    // Find first "name: '" in countries array and add this entry after that region's last country
    const oeRegex = /(name:\s*'Oriente Médio[^']*'[\s\S]*?countries:\s*\[)([\s\S]*?)(\n\s*\])/;
    const match = indexContent.match(oeRegex);
    if (match) {
      const before = indexContent.slice(0, match.index + match[1].length + match[2].length);
      const after = indexContent.slice(match.index + match[1].length + match[2].length);
      // Add comma to last entry if needed
      const trimmed = match[2].trimEnd();
      const sep = trimmed.endsWith(',') ? '\n' : ',\n';
      indexContent = before + sep + newCountryEntry.trimEnd() + after;
    }

    // Add to COUNTRY_NAMES dict
    indexContent = indexContent.replace(
      /(const COUNTRY_NAMES=\{[^}]+)\};/,
      `$1,${key}:'${name}'};`
    );

    await fetch(`${ghApi}/index.html`, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin: adicionar ${name} ao index`,
        content: utf8ToBase64(indexContent),
        sha: indexData.sha,
      })
    });
  }

  // 6. Update admin/index.html — COUNTRY_FILES dict
  const adminRes = await fetch(`${ghApi}/admin/index.html`, { headers: ghHeaders });
  if (adminRes.ok) {
    const adminData = await adminRes.json();
    let adminContent = base64ToUtf8(adminData.content);
    // Add to COUNTRY_FILES dict (insert before closing brace of dict)
    adminContent = adminContent.replace(
      /(const COUNTRY_FILES = \{[\s\S]*?)('brasil-sul':'Brasil Sul[^}]+\})/,
      `$1'${key}':'${name} ${flag}', $2`
    );
    await fetch(`${ghApi}/admin/index.html`, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin: adicionar ${name} ao dropdown da admin`,
        content: utf8ToBase64(adminContent),
        sha: adminData.sha,
      })
    });
  }

  return jsonResponse({
    success: true,
    name,
    flag,
    key,
    file: guideFile,
    next_steps: [
      'Aguarda 1-2 min para GitHub Pages republicar',
      'Recarrega a admin (⌘+Shift+R) para ver o novo país no dropdown',
      `Já podes adicionar estabelecimentos a ${name}!`
    ]
  });
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

// ===================== ANALYTICS =====================

async function handleAnalytics(url, env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return jsonResponse({
      error: 'Analytics not configured. Set CF_API_TOKEN and CF_ACCOUNT_ID secrets.'
    }, 500);
  }

  const range = url.searchParams.get('range') || '7d';
  const siteTag = url.searchParams.get('site') || env.CF_SITE_TAG || '';

  // Calculate date range — use plain dates for date_geq/date_leq filter
  const now = new Date();
  const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[range] || 7;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  // Use date format YYYY-MM-DD (the date filter expects date type)
  const sinceDate = since.toISOString().split('T')[0];
  const untilDate = now.toISOString().split('T')[0];

  // GraphQL query — inline filter values (avoids type-name guessing)
  const filterStr = `{ siteTag: "${siteTag}", date_geq: "${sinceDate}", date_leq: "${untilDate}" }`;
  const query = `
    query Analytics($accountTag: String!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          totals: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 1) {
            count
            sum { visits }
          }
          countries: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 20, orderBy: [count_DESC]) {
            count
            sum { visits }
            dimensions { countryName }
          }
          devices: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 10, orderBy: [count_DESC]) {
            count
            dimensions { deviceType }
          }
          paths: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 30, orderBy: [count_DESC]) {
            count
            dimensions { requestPath }
          }
          referers: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 20, orderBy: [count_DESC]) {
            count
            dimensions { refererHost }
          }
          daily: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 100, orderBy: [date_ASC]) {
            count
            sum { visits }
            dimensions { date }
          }
          browsers: rumPageloadEventsAdaptiveGroups(filter: ${filterStr}, limit: 10, orderBy: [count_DESC]) {
            count
            dimensions { userAgentBrowser }
          }
        }
      }
    }
  `;

  const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: env.CF_ACCOUNT_ID
      }
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    return jsonResponse({ error: 'Cloudflare API error', status: resp.status, detail: text }, 500);
  }

  const data = await resp.json();
  if (data.errors) {
    return jsonResponse({
      error: 'GraphQL: ' + (data.errors[0]?.message || 'unknown'),
      detail: data.errors,
      query_dates: { since: sinceDate, until: untilDate, siteTag }
    }, 500);
  }

  const account = data.data?.viewer?.accounts?.[0] || {};

  // Aggregate totals
  const totalPageviews = (account.totals || []).reduce((s, r) => s + (r.count || 0), 0);
  const totalVisits = (account.totals || []).reduce((s, r) => s + (r.sum?.visits || 0), 0);

  return jsonResponse({
    range,
    since: sinceDate,
    until: untilDate,
    summary: {
      pageviews: totalPageviews,
      visits: totalVisits,
    },
    countries: (account.countries || []).map(r => ({
      name: r.dimensions?.countryName || 'Unknown',
      pageviews: r.count,
      visits: r.sum?.visits || 0
    })).filter(r => r.name && r.name !== 'Unknown').slice(0, 10),
    devices: (account.devices || []).map(r => ({
      name: r.dimensions?.deviceType || 'Unknown',
      pageviews: r.count
    })).filter(r => r.name),
    paths: (account.paths || []).map(r => ({
      path: r.dimensions?.requestPath || '/',
      pageviews: r.count
    })).slice(0, 15),
    referers: (account.referers || []).map(r => ({
      host: r.dimensions?.refererHost || 'direct',
      pageviews: r.count
    })).slice(0, 10),
    daily: (account.daily || []).map(r => ({
      date: r.dimensions?.date,
      pageviews: r.count,
      visits: r.sum?.visits || 0
    })),
    browsers: (account.browsers || []).map(r => ({
      name: r.dimensions?.userAgentBrowser || 'Unknown',
      pageviews: r.count
    })).filter(r => r.name)
  });
}

// ===================== UTILS =====================

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Convert UTF-8 string to base64 (handles all Unicode chars including acentos)
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to UTF-8 string (correct decoding of multi-byte chars)
function base64ToUtf8(b64) {
  const cleaned = b64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}
