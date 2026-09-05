#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const DIR = path.resolve(__dirname, '..');

const GUIDES = [
  { file:'alemanha-guia.html',      slug:'alemanha-guia',      country:'Alemanha',          flag:'🇩🇪' },
  { file:'argentina-guia.html',     slug:'argentina-guia',     country:'Argentina',         flag:'🇦🇷' },
  { file:'aruba-guia.html',         slug:'aruba-guia',         country:'Aruba',             flag:'🇦🇼' },
  { file:'austria-guia.html',       slug:'austria-guia',       country:'Áustria',           flag:'🇦🇹' },
  { file:'bonaire-guia.html',       slug:'bonaire-guia',       country:'Bonaire',           flag:'🇧🇶' },
  { file:'brasil-centroeste.html',  slug:'brasil-centroeste',  country:'Brasil (Centro-Oeste)', flag:'🇧🇷' },
  { file:'brasil-nordeste.html',    slug:'brasil-nordeste',    country:'Brasil (Nordeste)', flag:'🇧🇷' },
  { file:'brasil-sudeste.html',     slug:'brasil-sudeste',     country:'Brasil (Sudeste)',  flag:'🇧🇷' },
  { file:'brasil-sul.html',         slug:'brasil-sul',         country:'Brasil (Sul)',      flag:'🇧🇷' },
  { file:'chile-guia.html',         slug:'chile-guia',         country:'Chile',             flag:'🇨🇱' },
  { file:'china-guia.html',         slug:'china-guia',         country:'China',             flag:'🇨🇳' },
  { file:'colombia-guia.html',      slug:'colombia-guia',      country:'Colômbia',         flag:'🇨🇴' },
  { file:'copenhague-guia.html',    slug:'copenhague-guia',    country:'Dinamarca',         flag:'🇩🇰' },
  { file:'coreia-guia.html',        slug:'coreia-guia',        country:'Coreia do Sul',     flag:'🇰🇷' },
  { file:'croacia-guia.html',       slug:'croacia-guia',       country:'Croácia',          flag:'🇭🇷' },
  { file:'curacao-guia.html',       slug:'curacao-guia',       country:'Curaçao',          flag:'🇨🇼' },
  { file:'dubai-guia.html',         slug:'dubai-guia',         country:'Dubai',             flag:'🇦🇪' },
  { file:'escocia-guia.html',       slug:'escocia-guia',       country:'Escócia',          flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { file:'espanha-guia.html',       slug:'espanha-guia',       country:'Espanha',           flag:'🇪🇸' },
  { file:'eua-guia.html',           slug:'eua-guia',           country:'Estados Unidos',    flag:'🇺🇸' },
  { file:'franca-guia.html',        slug:'franca-guia',        country:'França',           flag:'🇫🇷' },
  { file:'holanda-guia.html',       slug:'holanda-guia',       country:'Holanda',           flag:'🇳🇱' },
  { file:'hongkong-guia.html',      slug:'hongkong-guia',      country:'Hong Kong',         flag:'🇭🇰' },
  { file:'inglaterra-guia.html',    slug:'inglaterra-guia',    country:'Inglaterra',        flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { file:'irlanda-guia.html',       slug:'irlanda-guia',       country:'Irlanda',           flag:'🇮🇪' },
  { file:'irlanda-norte-guia.html', slug:'irlanda-norte-guia', country:'Irlanda do Norte',  flag:'🇬🇧' },
  { file:'italia-guia.html',        slug:'italia-guia',        country:'Itália',           flag:'🇮🇹' },
  { file:'japao-guia.html',         slug:'japao-guia',         country:'Japão',            flag:'🇯🇵' },
  { file:'liechtenstein-guia.html', slug:'liechtenstein-guia', country:'Liechtenstein',     flag:'🇱🇮' },
  { file:'luxemburgo-guia.html',    slug:'luxemburgo-guia',    country:'Luxemburgo',        flag:'🇱🇺' },
  { file:'marrocos-guia.html',      slug:'marrocos-guia',      country:'Marrocos',          flag:'🇲🇦' },
  { file:'monaco-guia.html',        slug:'monaco-guia',        country:'Mónaco',           flag:'🇲🇨' },
  { file:'panama-guia.html',        slug:'panama-guia',        country:'Panamá',           flag:'🇵🇦' },
  { file:'peru-guia.html',          slug:'peru-guia',          country:'Peru',              flag:'🇵🇪' },
  { file:'portugal-guia.html',      slug:'portugal-guia',      country:'Portugal',          flag:'🇵🇹' },
  { file:'tailandia-guia.html',     slug:'tailandia-guia',     country:'Tailândia',        flag:'🇹🇭' },
  { file:'taiwan-guia.html',        slug:'taiwan-guia',        country:'Taiwan',            flag:'🇹🇼' },
  { file:'turquia-guia.html',       slug:'turquia-guia',       country:'Turquia',           flag:'🇹🇷' },
  { file:'uruguai-guia.html',       slug:'uruguai-guia',       country:'Uruguai',           flag:'🇺🇾' },
  { file:'vietna-guia.html',        slug:'vietna-guia',        country:'Vietnã',           flag:'🇻🇳' },
];

// Extract the CITIES=[...] array from HTML using bracket counting (handles nesting correctly)
function extractCITIES(content) {
  const start = content.indexOf('const CITIES');
  if (start === -1) return null;
  const arrStart = content.indexOf('[', start);
  if (arrStart === -1) return null;

  let depth = 0, i = arrStart;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '[') { depth++; i++; continue; }
    if (ch === ']') { depth--; if (depth === 0) break; i++; continue; }
    // Skip strings to avoid counting brackets inside them
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch; i++;
      while (i < content.length) {
        if (content[i] === '\\') { i += 2; continue; }
        if (content[i] === q) break;
        i++;
      }
    }
    i++;
  }
  return content.substring(arrStart, i + 1);
}

const results = [];
let errors = 0;

for (const guide of GUIDES) {
  const filePath = path.join(DIR, guide.file);
  if (!fs.existsSync(filePath)) { console.warn('Not found:', guide.file); continue; }

  const content = fs.readFileSync(filePath, 'utf8');
  const citiesStr = extractCITIES(content);
  if (!citiesStr) { console.warn('No CITIES in:', guide.file); continue; }

  let cities;
  try {
    cities = vm.runInContext('(' + citiesStr + ')', vm.createContext({}));
  } catch(e) {
    console.error('Parse error in', guide.file, ':', e.message.slice(0, 120));
    errors++;
    continue;
  }

  let count = 0;
  for (const city of cities) {
    if (!city || !city.entries) continue;
    for (const e of city.entries) {
      if (!e || e.pending || !e.n) continue;
      results.push({
        n: e.n,
        q: e.q || '',
        t: e.t || 'r',
        m: e.m || '',
        s: e.s || 0,
        k: e.k || 0,
        city: city.city || '',
        region: city.region || '',
        guide: guide.slug,
        country: guide.country,
        flag: guide.flag,
      });
      count++;
    }
  }
  console.log(`✓ ${guide.file}: ${count} entries`);
}

const json = JSON.stringify(results);
fs.writeFileSync(path.join(DIR, 'search.json'), json);
console.log(`\n✅ search.json: ${results.length} entries, ${Math.round(json.length / 1024)} KB`);
if (errors) console.warn(`⚠️  ${errors} files had errors`);
