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

    const url = new URL(request.url);

    // Endpoint PÚBLICO: cadastro pelo formulário do site (sem X-Admin-Key)
    if (url.pathname === '/register' && request.method === 'POST') {
      try { return await handleRegister(request, env); }
      catch (err) { return jsonResponse({ error: err.message }, 500); }
    }

    // Endpoint PÚBLICO: resumo de viagens por ano (só agregados, sem PII) — a tabela da sobre.html lê daqui
    if (url.pathname === '/viagens-resumo' && request.method === 'GET') {
      try {
        const row = await env.DB.prepare("SELECT v FROM viagens_kv WHERE k='dados'").first();
        if (!row) return jsonResponse({ error: 'sem_dados' }, 404);
        const d = JSON.parse(row.v);
        return jsonResponse({ atualizado: d.atualizado || null, metricas: d.metricas || {} });
      } catch (err) { return jsonResponse({ error: err.message }, 500); }
    }

    // Auth check (todos os outros endpoints exigem a chave)
    // Aceita múltiplas chaves individuais e revogáveis: a principal (Luli/Tito)
    // + chaves extras por pessoa (ex.: ADMIN_KEY_TECH para o sócio de tecnologia).
    // Revogar alguém = apagar o segredo dele no Cloudflare, sem afetar os demais.
    const adminKey = request.headers.get('X-Admin-Key');
    const validKeys = [env.ADMIN_KEY, env.ADMIN_KEY_TECH].filter(Boolean);
    if (!adminKey || !validKeys.includes(adminKey)) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

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
      if (url.pathname === '/leads' && request.method === 'GET') {
        return await handleLeads(url, env);
      }
      if (url.pathname === '/sync-mailchimp' && request.method === 'POST') {
        return await handleSyncMailchimp(env);
      }
      if (url.pathname === '/update-lead' && request.method === 'POST') {
        return await handleUpdateLead(request, env);
      }
      if (url.pathname === '/viagens' && request.method === 'GET') {
        const row = await env.DB.prepare("SELECT v FROM viagens_kv WHERE k='dados'").first();
        if (!row) return jsonResponse({ error: 'sem_dados' }, 404);
        return new Response(row.v, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/viagens' && request.method === 'POST') {
        const body = await request.text();
        JSON.parse(body); // valida
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS viagens_kv (k TEXT PRIMARY KEY, v TEXT)").run();
        await env.DB.prepare("INSERT INTO viagens_kv (k,v) VALUES ('dados',?1) ON CONFLICT(k) DO UPDATE SET v=?1").bind(body).run();
        return jsonResponse({ ok: true, bytes: body.length });
      }
      if (url.pathname === '/viagens-promover' && request.method === 'POST') {
        return jsonResponse(await promoteUpcoming(env));
      }
      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({ ok: true, version: '1.3' });
      }
    } catch (err) {
      return jsonResponse({ error: err.message, stack: err.stack }, 500);
    }

    return jsonResponse({ error: 'not found' }, 404);
  },

  // Cron: sincroniza Mailchimp → D1 (mantém a base sempre completa, mesmo p/ cadastros que só foram ao Mailchimp)
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try { await handleSyncMailchimp(env); } catch (_) { /* silencioso */ }
      try { await promoteUpcoming(env); } catch (_) { /* silencioso — promove viagens vencidas */ }
    })());
  }
};

// ===================== PROMOÇÃO AUTOMÁTICA DE VIAGENS (cron) =====================
const COORD_CRON={CGH:[-23.63,-46.66],GRU:[-23.43,-46.47],SAO:[-23.5,-46.6],VCP:[-23.01,-47.13],REC:[-8.13,-34.92],EZE:[-34.82,-58.54],LIS:[38.77,-9.13],PTY:[9.07,-79.38],GYN:[-16.63,-49.22],FLN:[-27.67,-48.55],CWB:[-25.53,-49.18],BSB:[-15.87,-47.92],SDU:[-22.91,-43.16],RIO:[-22.9,-43.2],GIG:[-22.81,-43.25],SSA:[-12.91,-38.33],POA:[-29.99,-51.17],AJU:[-10.98,-37.07],MDZ:[-32.83,-68.79],SCL:[-33.39,-70.79],BOG:[4.7,-74.15],JFK:[40.64,-73.78],FOR:[-3.78,-38.53],CNF:[-19.62,-43.97],IGU:[-25.6,-54.49],CGB:[-15.65,-56.12],ORY:[48.72,2.38],PAR:[48.85,2.35],LYS:[45.73,5.08],OPO:[41.25,-8.68],MAD:[40.47,-3.57],MXP:[45.63,8.72],MIL:[45.63,8.72],DOH:[25.27,51.61],OTP:[44.57,26.09],FRA:[50.03,8.57],CDG:[49.01,2.55],NCE:[43.66,7.22],MVD:[-34.84,-56.03],LIM:[-12.02,-77.11],CUZ:[-13.54,-71.94],AQP:[-16.34,-71.57],CPH:[55.62,12.65],BOD:[44.83,-0.72],AMS:[52.31,4.76],ZRH:[47.46,8.55],DUB:[53.43,-6.24],DUS:[51.29,6.77],NAT:[-5.9,-35.25],MCZ:[-9.51,-35.79],SLZ:[-2.59,-44.23],LDB:[-23.33,-51.13],NVT:[-26.88,-48.65],PVG:[31.14,121.81],SHA:[31.14,121.81],HKG:[22.31,113.91],MGF:[-23.48,-52.01],UDI:[-18.88,-48.23],MIA:[25.79,-80.29],BCN:[41.3,2.08],EDI:[55.95,-3.36],MPL:[43.58,3.96],BEL:[-1.38,-48.48],LHR:[51.47,-0.45],IST:[41.26,28.74],KIX:[34.43,135.24],ICN:[37.46,126.44],PEK:[40.08,116.58],HND:[35.55,139.78],BKK:[13.68,100.75],HAN:[21.22,105.81],MUC:[48.35,11.79],TPE:[25.08,121.23],DXB:[25.25,55.36],SIN:[1.36,103.99],NRT:[35.77,140.39],CMN:[33.37,-7.59],ATH:[37.94,23.94],AEP:[-34.56,-58.42],BPS:[-16.44,-39.08],BVB:[2.85,-60.69],CUN:[21.04,-86.87],FEN:[-3.85,-32.42],IOS:[-14.82,-39.03],MAO:[-3.04,-60.05],MEX:[19.44,-99.07],MRS:[43.44,5.22],RAO:[-21.14,-47.77],SJP:[-20.82,-49.4],THE:[-5.06,-42.82],VIX:[-20.26,-40.29],XAP:[-27.13,-52.66]};
function kmSegCron(a,b){a=COORD_CRON[a];b=COORD_CRON[b];if(!a||!b)return 0;const p=Math.PI/180,la1=a[0],lo1=a[1],la2=b[0],lo2=b[1];const x=.5-Math.cos((la2-la1)*p)/2+Math.cos(la1*p)*Math.cos(la2*p)*(1-Math.cos((lo2-lo1)*p))/2;return 12742*Math.asin(Math.sqrt(x));}
function nightsBetween(ci,co){try{return Math.max(0,Math.round((new Date(co)-new Date(ci))/864e5));}catch(_){return 0;}}
async function promoteUpcoming(env){
  const row = await env.DB.prepare("SELECT v FROM viagens_kv WHERE k='dados'").first();
  if(!row) return { promoted:0, reason:'sem_dados' };
  const d = JSON.parse(row.v);
  const today = new Date().toISOString().slice(0,10);
  const up = d.upcoming || {};
  const segs = d.segments || (d.segments=[]);
  const stays = d.stays || (d.stays=[]);
  const m = d.metricas || (d.metricas={});
  const hasSeg = s => segs.some(x=>x.date===s.date && x.from===s.from && x.to===s.to);
  const hasStay = s => stays.some(x=>x.checkin===s.checkin && (x.hotel||'')===(s.hotel||''));
  const ensureY = y => (m[y] = m[y] || {dec:0,km:0,voltas:0,paises:0,estadias:0,noites:0,ref:0,dias_fora:0,noites_fora:0});
  let promoted=0; const touched=new Set(); const log=[];
  const keepF=[];
  for(const f of (up.flights||[])){
    if(f.date && f.date<=today){
      const seg={date:f.date,from:f.from,to:f.to,cia:f.cia||null,op:f.op||null,airline:f.airline||null,flight:f.flight||null,pnr:f.pnr||null,pax:'Luiz Ignacio',source:'cron-promote'};
      if(!hasSeg(seg)){ segs.push(seg); const y=f.date.slice(0,4); const a=ensureY(y); a.dec=(a.dec||0)+1; a.km=(a.km||0)+Math.round(kmSegCron(f.from,f.to)); touched.add(y); promoted++; log.push('voo '+f.date+' '+f.from+'->'+f.to); }
    } else keepF.push(f);
  }
  const keepH=[];
  for(const h of (up.hotels||[])){
    if(h.checkout && h.checkout<=today){
      const st={hotel:h.hotel,city:h.city||null,country:h.country||'Brazil',checkin:h.checkin,checkout:h.checkout,nights:h.nights||nightsBetween(h.checkin,h.checkout),guest:'Luiz Ignacio',source:'cron-promote'};
      if(!hasStay(st)){ stays.push(st); const y=(h.checkin||'').slice(0,4); const a=ensureY(y); a.estadias=(a.estadias||0)+1; a.noites=(a.noites||0)+st.nights; a.noites_fora=(a.noites_fora||0)+st.nights; touched.add(y); promoted++; log.push('hotel '+h.checkin+' '+(h.hotel||'')); }
    } else keepH.push(h);
  }
  if(!promoted) return { promoted:0 };
  for(const y of touched){ const a=m[y]; a.voltas=Math.round((a.km/40075)*10)/10; }
  up.flights=keepF; up.hotels=keepH; d.upcoming=up; d.atualizado=today;
  await env.DB.prepare("INSERT INTO viagens_kv (k,v) VALUES ('dados',?1) ON CONFLICT(k) DO UPDATE SET v=?1").bind(JSON.stringify(d)).run();
  return { promoted, touched:[...touched], log };
}

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
  const folder = country;

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
  // Entradas da Luli publicam diretamente; outros curadores ficam em standby
  if (cleanEntry.pending === undefined) {
    cleanEntry.pending = (cleanEntry.c !== 'luli');
  }
  if (cleanEntry.pending === false) delete cleanEntry.pending;

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
        const sep = (inside && !inside.endsWith(',')) ? ',' : '';
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
    const sep = (inside && !inside.endsWith(',')) ? ',' : '';
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

async function getCFAccessToken(env) {
  const refreshToken = env.CF_REFRESH_TOKEN;
  if (!refreshToken) return env.CF_API_TOKEN || null;

  // Try to get cached token from D1
  if (env.DB) {
    try {
      await env.DB.exec(`CREATE TABLE IF NOT EXISTS cf_token_cache (key TEXT PRIMARY KEY, value TEXT, expires_at INTEGER)`);
      const row = await env.DB.prepare('SELECT value, expires_at FROM cf_token_cache WHERE key = ?').bind('access_token').first();
      if (row && row.expires_at > Date.now() + 300000) {
        return row.value;
      }
    } catch (_) { /* D1 unavailable, continue */ }
  }

  // Refresh the OAuth token
  const res = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=54d11594-84e4-41aa-b438-e81b8fa78ee7`,
  });
  if (!res.ok) return env.CF_API_TOKEN || null;

  const data = await res.json();
  const accessToken = data.access_token;
  if (!accessToken) return env.CF_API_TOKEN || null;

  // Cache in D1
  if (env.DB && data.expires_in) {
    const expiresAt = Date.now() + (data.expires_in * 1000);
    try {
      await env.DB.prepare('INSERT OR REPLACE INTO cf_token_cache (key, value, expires_at) VALUES (?, ?, ?)').bind('access_token', accessToken, expiresAt).run();
    } catch (_) { /* ignore */ }
  }

  return accessToken;
}

async function handleAnalytics(url, env) {
  const range = url.searchParams.get('range') || '7d';
  const now = new Date();
  const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[range] || 7;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const sinceDate = since.toISOString().split('T')[0];
  const untilDate = now.toISOString().split('T')[0];

  const cfToken = await getCFAccessToken(env);
  if (!cfToken) {
    return jsonResponse({ error: 'Analytics not configured. Set CF_API_TOKEN or CF_REFRESH_TOKEN secrets.' }, 500);
  }

  const zoneId = env.CF_ZONE_ID || '15a1bd24a5161bdf163dbf5aa4af3232';

  // Zone analytics via GraphQL (httpRequests1dGroups — daily aggregates, available on all plans)
  // zoneTag goes to zones(), date_geq/date_leq go inside the dataset filter
  const dtFilter = `{ date_geq: "${sinceDate}", date_leq: "${untilDate}" }`;
  const query = `{
    viewer {
      zones(filter: { zoneTag: "${zoneId}" }) {
        daily: httpRequests1dGroups(filter: ${dtFilter}, limit: 180, orderBy: [date_ASC]) {
          sum { requests pageViews bytes countryMap { clientCountryName requests } browserMap { uaBrowserFamily pageViews } }
          uniq { uniques }
          dimensions { date }
        }
      }
    }
  }`;

  const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  if (!resp.ok) {
    return jsonResponse({ error: 'Cloudflare GraphQL error', status: resp.status, detail: await resp.text() }, 500);
  }

  const data = await resp.json();
  if (data.errors) {
    return jsonResponse({ error: 'GraphQL: ' + (data.errors[0]?.message || 'unknown'), detail: data.errors }, 500);
  }

  const dailyRows = data.data?.viewer?.zones?.[0]?.daily || [];

  // Aggregate totals across all days
  let totalPageViews = 0, totalRequests = 0, totalUniques = 0;
  const countryAgg = {}, browserAgg = {};

  for (const row of dailyRows) {
    totalPageViews += row.sum?.pageViews || 0;
    totalRequests += row.sum?.requests || 0;
    totalUniques += row.uniq?.uniques || 0;
    for (const c of (row.sum?.countryMap || [])) {
      countryAgg[c.clientCountryName] = (countryAgg[c.clientCountryName] || 0) + c.requests;
    }
    for (const b of (row.sum?.browserMap || [])) {
      browserAgg[b.uaBrowserFamily] = (browserAgg[b.uaBrowserFamily] || 0) + b.pageViews;
    }
  }

  const countries = Object.entries(countryAgg)
    .map(([name, pageviews]) => ({ name, pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .filter(r => r.name && r.name !== 'XX')
    .slice(0, 10);

  const browsers = Object.entries(browserAgg)
    .map(([name, pageviews]) => ({ name, pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 8);

  return jsonResponse({
    range,
    since: sinceDate,
    until: untilDate,
    summary: {
      pageviews: totalPageViews,
      visits: totalUniques,
    },
    countries,
    browsers,
    devices: [],
    paths: [],
    referers: [],
    daily: dailyRows.map(r => ({
      date: r.dimensions?.date,
      pageviews: r.sum?.pageViews || 0,
      visits: r.uniq?.uniques || 0,
    })),
  });
}

// ===================== LEADS =====================

async function ensureLeadsTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS leads (email TEXT PRIMARY KEY, nome TEXT, created_at TEXT NOT NULL, source TEXT DEFAULT 'form')"
  ).run();
}

// Sincroniza a audiência do Mailchimp → D1 (recupera quem entrou por lá e mantém a base completa).
// Requer o secret MAILCHIMP_API_KEY (formato "xxxxxxxx-us12"). Chamado sob demanda (/sync-mailchimp) e pelo cron.
async function handleSyncMailchimp(env) {
  const key = env.MAILCHIMP_API_KEY;
  if (!key) return jsonResponse({ error: 'MAILCHIMP_API_KEY não configurada no worker' }, 400);
  const dc = key.split('-')[1] || 'us12';
  const auth = 'Basic ' + btoa('any:' + key);
  await ensureLeadsTable(env);
  const lr = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists?count=100&fields=lists.id`, { headers: { Authorization: auth } });
  if (!lr.ok) return jsonResponse({ error: 'mailchimp lists ' + lr.status, detail: await lr.text() }, 502);
  const lists = (await lr.json()).lists || [];
  let seen = 0, novos = 0;
  for (const list of lists) {
    let offset = 0;
    for (;;) {
      const mr = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${list.id}/members?count=1000&offset=${offset}&status=subscribed`, { headers: { Authorization: auth } });
      if (!mr.ok) break;
      const members = (await mr.json()).members || [];
      if (!members.length) break;
      for (const m of members) {
        seen++;
        const email = String(m.email_address || '').trim().toLowerCase();
        if (!email) continue;
        const mf = m.merge_fields || {};
        const nome = ((mf.FNAME || '') + ' ' + (mf.LNAME || '')).trim();
        const ca = m.timestamp_opt || m.timestamp_signup || new Date().toISOString();
        const res = await env.DB.prepare(
          "INSERT INTO leads (email, nome, created_at, source) VALUES (?1, ?2, ?3, 'mailchimp') " +
          "ON CONFLICT(email) DO UPDATE SET nome = COALESCE(NULLIF(?2, ''), nome)"
        ).bind(email, nome, ca).run();
        if (res.meta && res.meta.changes) novos++;
      }
      offset += members.length;
      if (members.length < 1000) break;
    }
  }
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM leads").first();
  return jsonResponse({ ok: true, vistos: seen, novos, total: row ? row.n : null });
}

// Cadastro público vindo do formulário do site → grava no D1 (fonte de verdade própria, sempre atualizada)
async function handleRegister(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return jsonResponse({ error: 'json inválido' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  const nome = String(body.nome || body.name || '').trim().slice(0, 120);
  if (!email || email.length > 160 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return jsonResponse({ error: 'email inválido' }, 400);
  }
  await ensureLeadsTable(env);
  await env.DB.prepare(
    "INSERT INTO leads (email, nome, created_at, source) VALUES (?1, ?2, ?3, 'form') " +
    "ON CONFLICT(email) DO UPDATE SET nome = COALESCE(NULLIF(?2, ''), nome)"
  ).bind(email, nome, new Date().toISOString()).run();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM leads").first();
  return jsonResponse({ ok: true, total: row ? row.n : null });
}

// Editar o nome de um cadastro (admin) — grava no D1 E no Mailchimp (FNAME/LNAME),
// para o nome aparecer também nos e-mails marketing (merge tag *|FNAME|*).
async function handleUpdateLead(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return jsonResponse({ error: 'json inválido' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  const nome = String(body.nome || '').trim().slice(0, 120);
  if (!email) return jsonResponse({ error: 'email obrigatório' }, 400);
  await ensureLeadsTable(env);
  await env.DB.prepare("UPDATE leads SET nome = ?1 WHERE email = ?2").bind(nome, email).run();

  // Espelha no Mailchimp (via batch subscribe com update_existing — casa por e-mail, sem precisar de hash)
  let mailchimp = 'sem_key';
  const key = env.MAILCHIMP_API_KEY;
  if (key) {
    try {
      const dc = key.split('-')[1] || 'us12';
      const auth = 'Basic ' + btoa('any:' + key);
      const lr = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists?count=1&fields=lists.id`, { headers: { Authorization: auth } });
      const lists = lr.ok ? ((await lr.json()).lists || []) : [];
      if (!lists.length) { mailchimp = 'sem_lista'; }
      else {
        const fname = nome.split(' ')[0] || '';
        const lname = nome.split(' ').slice(1).join(' ');
        const pr = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${lists[0].id}`, {
          method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ members: [{ email_address: email, merge_fields: { FNAME: fname, LNAME: lname } }], update_existing: true })
        });
        mailchimp = pr.ok ? 'ok' : ('erro ' + pr.status);
      }
    } catch (e) { mailchimp = 'erro'; }
  }
  return jsonResponse({ ok: true, mailchimp });
}

// Lista de cadastros para o admin — lê do D1 (fonte de verdade própria)
async function handleLeads(url, env) {
  await ensureLeadsTable(env);
  const { results } = await env.DB.prepare(
    "SELECT email, nome, created_at FROM leads ORDER BY created_at DESC"
  ).all();
  return jsonResponse({
    total: results.length,
    members: (results || []).map(m => ({
      email: m.email,
      fname: m.nome || '',
      lname: '',
      status: 'subscribed',
      signed_up: m.created_at,
    })),
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
