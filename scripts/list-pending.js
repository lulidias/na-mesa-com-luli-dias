#!/usr/bin/env node
/**
 * Lista entries em modo pending (escondidas do site, à espera de revisão).
 *
 * Run: node scripts/list-pending.js
 *
 * Para APROVAR uma entry (torná-la visível), edita o ficheiro do guia e remove
 * o campo `"pending":true` da entry, depois faz commit. O auto-counts atualiza
 * automaticamente.
 *
 * Para apagar pending entries em massa (rejeitar todas), corre:
 *   node scripts/approve-all-pending.js  (script separado, ainda não criado)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const guides = fs.readdirSync(ROOT).filter(f => f.endsWith('-guia.html'));
const brasilFiles = fs.readdirSync(ROOT).filter(f => f.startsWith('brasil-') && f.endsWith('.html') && f !== 'brasil-index.html');
const sources = [...guides, ...brasilFiles];

let total = 0;
const byFile = {};

for (const g of sources) {
  const c = fs.readFileSync(path.join(ROOT, g), 'utf8');
  const re = /const\s+CITIES\s*=\s*\[/g;
  let m;
  const pendings = [];
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
      const CITIES = eval(c.substring(startIdx, end + 1));
      for (const city of (CITIES || [])) {
        if (!city || !city.entries) continue;
        for (const r of city.entries) {
          if (r && r.pending) {
            pendings.push({ name: r.n, city: city.city, type: r.t || 'r', curator: r.c || '?' });
          }
        }
      }
    } catch (e) {}
    re.lastIndex = end + 1;
  }
  if (pendings.length > 0) {
    byFile[g] = pendings;
    total += pendings.length;
  }
}

console.log('═══ PENDING ENTRIES (à espera de revisão) ═══\n');
if (total === 0) {
  console.log('✅ Nenhuma entry pending — tudo visível no site.\n');
  process.exit(0);
}
console.log(`Total: ${total} entries em ${Object.keys(byFile).length} ficheiros\n`);

for (const [file, list] of Object.entries(byFile)) {
  console.log(`━━━ ${file} (${list.length}) ━━━`);
  for (const e of list) {
    const icon = e.type === 'h' ? '🏨' : e.type === 'm' ? '🛒' : '🍽';
    console.log(`  ${icon} ${e.name.padEnd(35)} · ${e.city.padEnd(20)} · curador: ${e.curator}`);
  }
  console.log('');
}

console.log('Para aprovar uma entry: abre o ficheiro, encontra a entry e apaga `"pending":true,` (ou `pending:true,`).');
console.log('Depois faz commit. O auto-counts atualiza sozinho.');
