#!/usr/bin/env node
/**
 * Auditoria de inconsistências Michelin.
 *
 * Varre todos os guides e detecta entries onde o TEXTO menciona uma
 * distinção Michelin mas o campo `m:` está ausente ou errado (e vice-versa).
 *
 * Run: node scripts/audit-michelin.js
 *
 * Não modifica nada — só reporta. Tu vês a lista e decides o que fixar.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const guides = fs.readdirSync(ROOT).filter(f => f.endsWith('-guia.html'));
const brasilFiles = fs.readdirSync(ROOT).filter(f => f.startsWith('brasil-') && f.endsWith('.html') && f !== 'brasil-index.html');

// Patterns: each rule says "if text matches X, then `m:` should be Y"
// Stricter — require "Michelin" or "estrela" together with star count to avoid
// false positives from hotel star ratings ("5★") or other restaurants mentioned.
const RULES = [
  { name: '3 Estrelas',        pattern: /\b3 estrelas michelin\b|\bthree michelin stars\b/i, expected: 'm3' },
  { name: '2 Estrelas',        pattern: /\b2 estrelas michelin\b|\bduas estrelas michelin\b|\btwo michelin stars\b/i, expected: 'm2' },
  { name: '1 Estrela',         pattern: /\b1 estrela michelin\b|\buma estrela michelin\b|\bone michelin star\b/i, expected: 'm1' },
  { name: 'Bib Gourmand',      pattern: /\bbib gourmand\b/i, expected: 'bib' },
  { name: 'Estrela Verde',     pattern: /\bestrela verde\b|\bgreen star\b/i, expected: 'green' },
];

const issues = [];

function parseGuide(filePath) {
  const c = fs.readFileSync(filePath, 'utf8');
  const all = [];
  const re = /const\s+CITIES\s*=\s*\[/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    const startIdx = m.index + m[0].length - 1;
    let depth = 0, inStr = null, esc = false, end = -1;
    for (let i = startIdx; i < c.length; i++) {
      const ch = c[i];
      if (esc) { esc = false; continue; }
      if (inStr) { if (ch === '\\') { esc = true; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    try {
      const parsed = eval(c.substring(startIdx, end + 1));
      if (Array.isArray(parsed)) all.push(...parsed);
    } catch (e) { /* skip */ }
    re.lastIndex = end + 1;
  }
  return all;
}

const sources = [
  ...guides.map(f => ({ slug: f.replace('-guia.html',''), files: [f] })),
];
if (brasilFiles.length > 0) sources.push({ slug: 'brasil', files: brasilFiles });

for (const src of sources) {
  for (const f of src.files) {
    const CITIES = parseGuide(path.join(ROOT, f));
    for (const city of CITIES) {
      if (!city || !city.entries) continue;
      for (const r of city.entries) {
        if (!r) continue;
        // Skip hotels — hotels don't get Michelin stars/Bib (only Keys, handled separately).
        // Their descriptions often mention OTHER restaurants' stars which would false-positive.
        if (r.t === 'h') continue;
        const text = ((r.d || '') + ' ' + (r.note || '') + ' ' + (r.q || '')).toLowerCase();
        const currentM = r.m || null;

        // Find which (if any) Michelin distinction is implied by text
        let detected = null;
        for (const rule of RULES) {
          if (rule.pattern.test(text)) {
            detected = rule.expected;
            break;
          }
        }

        // Build issue if mismatch
        if (detected && currentM !== detected) {
          issues.push({
            country: src.slug,
            file: f,
            name: r.n,
            city: city.city,
            currentM: currentM || '(none)',
            detected,
            kind: 'text-suggests-' + detected,
            snippet: (r.note || r.d || '').slice(0, 100)
          });
        } else if (!detected && currentM && currentM !== 'rec') {
          // text doesn't mention Michelin but m is set (other than 'rec' which can be silent)
          // Only flag if note/description seem to NOT mention Michelin at all
          if (!/michelin|estrela|star/i.test(text)) {
            issues.push({
              country: src.slug,
              file: f,
              name: r.n,
              city: city.city,
              currentM,
              detected: null,
              kind: 'm-set-but-no-text-mention',
              snippet: (r.note || r.d || '').slice(0, 100)
            });
          }
        }
      }
    }
  }
}

// Group by kind
const byKind = {};
for (const i of issues) {
  if (!byKind[i.kind]) byKind[i.kind] = [];
  byKind[i.kind].push(i);
}

console.log('═══ AUDITORIA MICHELIN — INCONSISTÊNCIAS ═══\n');
console.log(`Total de problemas detectados: ${issues.length}\n`);

const kindOrder = ['text-suggests-m3', 'text-suggests-m2', 'text-suggests-m1', 'text-suggests-bib', 'text-suggests-green', 'm-set-but-no-text-mention'];
const kindLabels = {
  'text-suggests-m3': '★★★ Texto sugere 3 Estrelas mas m: está errado/vazio',
  'text-suggests-m2': '★★ Texto sugere 2 Estrelas mas m: está errado/vazio',
  'text-suggests-m1': '★ Texto sugere 1 Estrela mas m: está errado/vazio',
  'text-suggests-bib': 'Bib Texto sugere Bib Gourmand mas m: está errado/vazio',
  'text-suggests-green': '🌿 Texto sugere Estrela Verde mas m: está errado/vazio',
  'm-set-but-no-text-mention': '⚠️  m: está definido mas texto não menciona Michelin (verificar se ainda válido)'
};

for (const kind of kindOrder) {
  const list = byKind[kind] || [];
  if (list.length === 0) continue;
  console.log(`\n━━━ ${kindLabels[kind]} (${list.length}) ━━━`);
  for (const i of list) {
    console.log(`  ${i.country.padEnd(15)} ${i.name.padEnd(35)} ${i.city.padEnd(20)} m='${i.currentM}' → '${i.detected}'`);
    console.log(`    "${i.snippet}..."`);
  }
}

if (issues.length === 0) console.log('✅ Nenhuma inconsistência detectada — base limpa.\n');
