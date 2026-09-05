#!/usr/bin/env node
/**
 * Sincroniza os valores fixos da .stats-bar no HTML de cada guia com os
 * números reais calculados a partir do array CITIES daquele ficheiro.
 *
 * É a mesma contagem que o IIFE "AUTO-COUNT stats-bar" faz em runtime — aqui
 * gravamos o resultado no HTML estático para que o fallback (antes do JS rodar,
 * ou se o JS falhar) esteja sempre certo. CITIES continua a ser a fonte única.
 *
 * Uso: node scripts/sync-stats-bars.js          (grava as alterações)
 *      node scripts/sync-stats-bars.js --check  (só reporta, não grava)
 *
 * Corre automaticamente no workflow build-counts.yml.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

const files = fs.readdirSync(ROOT).filter(f =>
  (f.endsWith('-guia.html')) ||
  (f.startsWith('brasil-') && f.endsWith('.html') && f !== 'brasil-index.html')
);

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
    } catch (e) { /* ignora — auditoria trata disto */ }
    re.lastIndex = end + 1;
  }
  return all;
}

// Mesma categorização do build-counts.js: Wine Bar / Loja de Vinho / Mercado
// NÃO contam como restaurante (têm categoria própria no home).
function catOf(q){ if(!q) return null; const t=String(q).toLowerCase(); const f0=t.split('·')[0].trim();
  if(/loja de vinho|garrafeira|wine shop/.test(t)) return 'lojaVinho';
  if(/wine bar|bar de vinho/.test(f0)) return 'wineBar';
  if(/mercado|market|food hall|food court/.test(f0) && !/^(bistr|sushi|restaurante|izakaya)/.test(f0)) return 'mercado';
  return null; }

function countCities(cities) {
  let r = 0, h = 0, mk = 0, c = 0, m1 = 0, m2 = 0, m3 = 0, bib = 0, k1 = 0, k2 = 0, k3 = 0;
  for (const city of cities) {
    if (!city || !city.entries || city.entries.length === 0) continue;
    c++;
    for (const e of city.entries) {
      if (!e || e.pending) continue;
      if (e.t === 'h') { h++; if (e.k === 1) k1++; else if (e.k === 2) k2++; else if (e.k === 3) k3++; }
      else { const _c = catOf(e.q) || (e.t === 'm' ? 'mercado' : null); if (_c === 'mercado') mk++; else if (!_c) r++; }
      if (e.m === 'm1') m1++; else if (e.m === 'm2') m2++; else if (e.m === 'm3') m3++;
      else if (e.m === 'bib') bib++;
    }
  }
  return { r, h, mk, c, stars: m1 + m2 * 2 + m3 * 3, keys: k1 + k2 * 2 + k3 * 3, bib };
}

// Resolve o valor do stat-num a partir do texto do stat-lbl (mesma lógica do IIFE).
function valueForLabel(label, n) {
  const l = label.toLowerCase().trim();
  if (l.includes('restaurante')) return String(n.r);
  if (l.includes('cidade') || l.includes('estado')) return String(n.c);
  if (l.includes('hotel') || l.includes('hotéis') || l.includes('hoteis')) return String(n.h);
  if (l.includes('michelin') || l.includes('estrela')) return n.stars > 0 ? n.stars + ' ★' : '0';
  if (l.includes('chave')) return n.keys > 0 ? n.keys + ' 🗝' : '0';
  if (l.includes('bib')) return String(n.bib);
  if (l.includes('mercado')) return String(n.mk);
  return null; // label desconhecido — não toca
}

const STAT_RE = /(<div class="stat"><div class="stat-num">)([^<]*)(<\/div><div class="stat-lbl"[^>]*>)([^<]*)(<\/div><\/div>)/g;

let changedFiles = 0;
const report = [];

for (const file of files) {
  const full = path.join(ROOT, file);
  const text = fs.readFileSync(full, 'utf8');
  const n = countCities(extractCities(text));
  const changes = [];
  const updated = text.replace(STAT_RE, (m, p1, oldVal, p3, label, p5) => {
    const newVal = valueForLabel(label, n);
    if (newVal === null || newVal === oldVal) return m;
    changes.push(`${label.trim()}: ${oldVal} → ${newVal}`);
    return p1 + newVal + p3 + label + p5;
  });
  if (changes.length) {
    changedFiles++;
    report.push(`  ${file}: ${changes.join(' · ')}`);
    if (!CHECK) fs.writeFileSync(full, updated);
  }
}

console.log(CHECK ? '=== sync-stats-bars (--check, sem gravar) ===' : '=== sync-stats-bars ===');
if (report.length) report.forEach(r => console.log(r));
console.log(`${changedFiles} ficheiro(s) ${CHECK ? 'desatualizado(s)' : 'atualizado(s)'} de ${files.length}.`);
process.exit(CHECK && changedFiles ? 1 : 0);
