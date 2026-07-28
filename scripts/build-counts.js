#!/usr/bin/env node
/**
 * Build counts.json from all guides.
 *
 * Run locally: node scripts/build-counts.js
 * Runs automatically on every push via .github/workflows/build-counts.yml
 *
 * Outputs counts.json with:
 *   { totals: {restaurants, hotels, m1, m2, m3, bib, green, rec, keys1, keys2, keys3, countries, totalStars, totalKeys}
 *   , countries: { 'portugal': {restaurants, hotels, cities, michelin, keys, ...}, ... }
 *   , generated_at: ISO timestamp }
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function catOf(q){ if(!q) return null; const t=String(q).toLowerCase(); const f0=t.split('·')[0].trim();
  if(/loja de vinho|garrafeira|wine shop/.test(t)) return 'lojaVinho';
  if(/wine bar|bar de vinho/.test(f0)) return 'wineBar';
  if(/mercado|market|food hall|food court/.test(f0) && !/^(bistr|sushi|restaurante|izakaya)/.test(f0)) return 'mercado';
  return null; }
// Standard guides: *-guia.html
// Special case Brasil: split across brasil-sudeste/nordeste/sul/centroeste/norte.html
const standardGuides = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('-guia.html'))
  .map(f => ({ slug: f.replace('-guia.html', ''), files: [f] }));

const brasilFiles = fs.readdirSync(ROOT)
  .filter(f => f.startsWith('brasil-') && f.endsWith('.html') && f !== 'brasil-index.html');
const guideSources = [...standardGuides];
if (brasilFiles.length > 0) {
  // Combined brasil entry (for the global totals)
  guideSources.push({ slug: 'brasil', files: brasilFiles });
  // Individual Brasil regions (for brasil-index.html dynamic counts)
  for (const f of brasilFiles) {
    const regionSlug = f.replace('.html', ''); // e.g. 'brasil-sul'
    guideSources.push({ slug: regionSlug, files: [f], brasilRegion: true });
  }
}

const totals = { restaurants: 0, hotels: 0, markets: 0, cities: 0, lojaVinho: 0, wineBar: 0, mercado: 0, m1: 0, m2: 0, m3: 0, bib: 0, green: 0, rec: 0, keys1: 0, keys2: 0, keys3: 0, countries: 0 };
const countries = {};
const states = {}; // Per-state breakdown for Brasil cards in brasil-index.html

for (const source of guideSources) {
  const slug = source.slug;
  // Concatenate all files for this country (Brasil has multiple)
  const c = source.files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n\n');
  // Find all `const CITIES = [` blocks (Brasil has multiple regional files concatenated)
  const citiesRegex = /const\s+CITIES\s*=\s*\[/g;
  const allCities = [];
  let m;
  while ((m = citiesRegex.exec(c)) !== null) {
    const startIdx = m.index + m[0].length - 1;
    let depth = 0, inStr = null, esc = false, end = -1;
    for (let i = startIdx; i < c.length; i++) {
      const ch = c[i];
      if (esc) { esc = false; continue; }
      if (inStr) {
        if (ch === '\\') { esc = true; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    try {
      const parsed = eval(c.substring(startIdx, end + 1));
      if (Array.isArray(parsed)) allCities.push(...parsed);
    } catch (e) {
      console.error(`Failed to parse CITIES block in ${slug}: ${e.message}`);
    }
    citiesRegex.lastIndex = end + 1;
  }

  if (allCities.length === 0) continue;
  const CITIES = allCities;

  const country = { restaurants: 0, hotels: 0, markets: 0, cities: 0, lojaVinho: 0, wineBar: 0, mercado: 0, m1: 0, m2: 0, m3: 0, bib: 0, green: 0, rec: 0, keys1: 0, keys2: 0, keys3: 0 };
  let hasContent = false;

  for (const city of CITIES) {
    if (!city || !city.entries || city.entries.length === 0) continue;
    country.cities++;

    // Per-state breakdown (Brasil only)
    if (city.region && source.files.some(f => f.startsWith('brasil-'))) {
      const stateKey = city.region;
      if (!states[stateKey]) states[stateKey] = { restaurants: 0, hotels: 0, cities: 0 };
      states[stateKey].cities++;
    }

    for (const r of city.entries) {
      if (!r) continue;
      if (r.pending) continue;  // pending entries don't count toward stats
      hasContent = true;
      if (r.t === 'h') {
        country.hotels++;
        if (r.k === 1) country.keys1++;
        else if (r.k === 2) country.keys2++;
        else if (r.k === 3) country.keys3++;
        if (city.region && source.files.some(f => f.startsWith('brasil-'))) states[city.region].hotels = (states[city.region].hotels || 0) + 1;
      } else {
        // Categorias DISJUNTAS: loja de vinho / wine bar / mercado contam no proprio
        // balde e NAO em restaurantes, para o total nao sobrepor categorias.
        let _cat = catOf(r.q);
        if (!_cat && r.t === 'm') _cat = 'mercado';
        if (_cat) {
          country[_cat]++;
          if (_cat === 'mercado') country.markets++;
        } else {
          country.restaurants++;
          if (city.region && source.files.some(f => f.startsWith('brasil-'))) states[city.region].restaurants = (states[city.region].restaurants || 0) + 1;
        }
      }
      if (r.m === 'm1') country.m1++;
      else if (r.m === 'm2') country.m2++;
      else if (r.m === 'm3') country.m3++;
      else if (r.m === 'bib') country.bib++;
      else if (r.m === 'green') country.green++;
      else if (r.m === 'rec') country.rec++;
    }
  }

  country.totalStars = country.m1 + country.m2 * 2 + country.m3 * 3;
  country.totalKeys = country.keys1 + country.keys2 * 2 + country.keys3 * 3;
  country.michelin = country.m1 + country.m2 + country.m3 + country.bib + country.green;
  country.keysEntries = country.keys1 + country.keys2 + country.keys3;
  countries[slug] = country;
  // Brasil regions are stored individually but NOT added to totals (the combined 'brasil' entry handles that)
  if (!source.brasilRegion) {
    totals.countries++;
    if (hasContent) {
      for (const k of ['restaurants', 'hotels', 'markets', 'cities', 'lojaVinho', 'wineBar', 'mercado', 'm1', 'm2', 'm3', 'bib', 'green', 'rec', 'keys1', 'keys2', 'keys3']) {
        totals[k] += country[k];
      }
    }
  }
}

totals.totalStars = totals.m1 + totals.m2 * 2 + totals.m3 * 3;
totals.totalKeys = totals.keys1 + totals.keys2 * 2 + totals.keys3 * 3;
totals.total = totals.restaurants + totals.hotels + totals.lojaVinho + totals.wineBar + totals.mercado;
totals.michelin = totals.m1 + totals.m2 + totals.m3 + totals.bib + totals.green;
totals.keysEntries = totals.keys1 + totals.keys2 + totals.keys3;

// NOTA: não incluímos timestamp aqui — se incluíssemos, cada execução criava
// uma diferença mesmo sem mudanças nas contagens, gerando conflitos de merge
// entre commits locais e o GitHub Action.
const output = {
  totals,
  countries,
  states
};

const outPath = path.join(ROOT, 'counts.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`✓ counts.json updated`);
console.log(`  ${totals.countries} países · ${totals.restaurants} restaurantes · ${totals.hotels} hotéis`);
console.log(`  ${totals.totalStars}★ · ${totals.bib} Bib · ${totals.totalKeys}🗝`);
