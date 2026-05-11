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
// Standard guides: *-guia.html
// Special case Brasil: split across brasil-sudeste/nordeste/sul/centroeste/norte.html
const standardGuides = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('-guia.html'))
  .map(f => ({ slug: f.replace('-guia.html', ''), files: [f] }));

const brasilFiles = fs.readdirSync(ROOT)
  .filter(f => f.startsWith('brasil-') && f.endsWith('.html') && f !== 'brasil-index.html');
const guideSources = [...standardGuides];
if (brasilFiles.length > 0) {
  guideSources.push({ slug: 'brasil', files: brasilFiles });
}

const totals = { restaurants: 0, hotels: 0, markets: 0, m1: 0, m2: 0, m3: 0, bib: 0, green: 0, rec: 0, keys1: 0, keys2: 0, keys3: 0, countries: 0 };
const countries = {};

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

  const country = { restaurants: 0, hotels: 0, markets: 0, cities: 0, m1: 0, m2: 0, m3: 0, bib: 0, green: 0, rec: 0, keys1: 0, keys2: 0, keys3: 0 };
  let hasContent = false;

  for (const city of CITIES) {
    if (!city || !city.entries || city.entries.length === 0) continue;
    country.cities++;
    for (const r of city.entries) {
      if (!r) continue;
      hasContent = true;
      if (r.t === 'h') {
        country.hotels++;
        if (r.k === 1) country.keys1++;
        else if (r.k === 2) country.keys2++;
        else if (r.k === 3) country.keys3++;
      } else if (r.t === 'm') {
        country.markets++;
        country.restaurants++;
      } else {
        country.restaurants++;
      }
      if (r.m === 'm1') country.m1++;
      else if (r.m === 'm2') country.m2++;
      else if (r.m === 'm3') country.m3++;
      else if (r.m === 'bib') country.bib++;
      else if (r.m === 'green') country.green++;
      else if (r.m === 'rec') country.rec++;
    }
  }

  if (hasContent) {
    country.totalStars = country.m1 + country.m2 * 2 + country.m3 * 3;
    country.totalKeys = country.keys1 + country.keys2 * 2 + country.keys3 * 3;
    country.michelin = country.m1 + country.m2 + country.m3 + country.bib + country.green;
    country.keysEntries = country.keys1 + country.keys2 + country.keys3;
    countries[slug] = country;
    totals.countries++;
    for (const k of ['restaurants', 'hotels', 'markets', 'm1', 'm2', 'm3', 'bib', 'green', 'rec', 'keys1', 'keys2', 'keys3']) {
      totals[k] += country[k];
    }
  }
}

totals.totalStars = totals.m1 + totals.m2 * 2 + totals.m3 * 3;
totals.totalKeys = totals.keys1 + totals.keys2 * 2 + totals.keys3 * 3;
totals.michelin = totals.m1 + totals.m2 + totals.m3 + totals.bib + totals.green;
totals.keysEntries = totals.keys1 + totals.keys2 + totals.keys3;

const output = {
  generated_at: new Date().toISOString(),
  totals,
  countries
};

const outPath = path.join(ROOT, 'counts.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`✓ counts.json updated`);
console.log(`  ${totals.countries} países · ${totals.restaurants} restaurantes · ${totals.hotels} hotéis`);
console.log(`  ${totals.totalStars}★ · ${totals.bib} Bib · ${totals.totalKeys}🗝`);
