#!/usr/bin/env node
/**
 * Actualiza os card-meta dos estados em brasil-index.html com as contagens
 * reais calculadas a partir dos ficheiros de guia.
 *
 * Usa o mesmo mecanismo de build-counts.js (parse do CITIES array) para
 * garantir que a fonte da verdade é sempre o HTML dos guias.
 *
 * Uso: node scripts/sync-brasil-index.js          (grava alterações)
 *      node scripts/sync-brasil-index.js --check  (só reporta, não grava)
 *
 * Corre automaticamente no workflow build-counts.yml.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

// ── 1. Calcular contagens por estado ─────────────────────────────────────────

function extractCities(text) {
  const re = /const\s+CITIES\s*=\s*\[/g;
  const all = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[0].length - 1;
    let depth = 0, inStr = null, esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (inStr) { if (ch === '\\') esc = true; else if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    try {
      const parsed = eval(text.substring(start, end + 1));
      if (Array.isArray(parsed)) all.push(...parsed);
    } catch (e) { /* ignora blocos que não parseiam */ }
    re.lastIndex = end + 1;
  }
  return all;
}

const brasilFiles = fs.readdirSync(ROOT)
  .filter(f => f.startsWith('brasil-') && f.endsWith('.html') && f !== 'brasil-index.html');

const stateCounts = {}; // e.g. { 'São Paulo': { r: 211, h: 9 }, ... }

for (const file of brasilFiles) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const cities = extractCities(text);
  for (const city of cities) {
    if (!city || !city.entries || !city.region) continue;
    const region = city.region;
    if (!stateCounts[region]) stateCounts[region] = { r: 0, h: 0 };
    for (const e of city.entries) {
      if (!e || e.pending) continue;
      if (e.t === 'h') stateCounts[region].h++;
      else stateCounts[region].r++;
    }
  }
}

// ── 2. Gerar string "X restaurantes · Y hotéis" ──────────────────────────────

function metaStr(r, h) {
  const rStr = r === 1 ? '1 restaurante' : `${r} restaurantes`;
  const hStr = h === 0 ? '' : h === 1 ? '1 hotel' : `${h} hotéis`;
  if (h === 0) return rStr;
  if (r === 0) return hStr;
  return `${rStr} · ${hStr}`;
}

// ── 3. Actualizar brasil-index.html ──────────────────────────────────────────

// Mapeamento estado → chave em stateCounts (normalizada)
// O href do card contém o state=<name> — extraímos esse nome do atributo href.
const indexPath = path.join(ROOT, 'brasil-index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const original = html;

const changes = [];

// Cada card tem href com state=<URLencoded> e o .card-meta logo abaixo.
// Passe ÚNICO com replacer de função — evita o loop infinito / OOM do
// padrão antigo (while + lastIndex=0 + html.replace por conteúdo).
const cardRe = /(<a class="country-card"[^>]*href="[^"]*[?&]state=([^"&]+)"[^>]*>[\s\S]*?<div class="card-meta">)([^<]*)(<\/div>)/g;
html = html.replace(cardRe, (full, pre, stateEnc, meta, post) => {
  let stateName;
  try { stateName = decodeURIComponent(stateEnc); } catch (e) { return full; }
  const counts = stateCounts[stateName];
  if (!counts) return full;
  const correct = metaStr(counts.r, counts.h);
  if (meta !== correct) changes.push(`  ${stateName}: "${meta}" → "${correct}"`);
  return pre + correct + post;
});

if (!CHECK && html !== original) {
  fs.writeFileSync(indexPath, html);
}

console.log(CHECK ? '=== sync-brasil-index (--check) ===' : '=== sync-brasil-index ===');
if (changes.length) changes.forEach(c => console.log(c));
else console.log('  Tudo actualizado — nenhuma alteração necessária.');
process.exit(CHECK && changes.length ? 1 : 0);
