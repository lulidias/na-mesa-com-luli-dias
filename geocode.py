#!/usr/bin/env python3
"""
Geocodifica todos os endereços de restaurantes do guia "Na Mesa com Luli Dias".

Uso:
    python3 geocode.py

Lê todos os arquivos *-guia.html, extrai nome+endereço de cada restaurante,
e geocodifica via Nominatim/OpenStreetMap (gratuito, sem chave).

Salva o resultado em coords.json. Se for interrompido, pode ser executado
novamente que continua de onde parou.

Respeita o rate limit do Nominatim (1 req/segundo, conforme política de uso).
"""

import json
import os
import re
import sys
import time
import unicodedata
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

REPO = os.path.dirname(os.path.abspath(__file__))
COORDS_FILE = os.path.join(REPO, 'coords.json')
USER_AGENT = 'NaMesaComLuliDias/1.0 (lulidias@me.com)'  # Política do Nominatim exige User-Agent identificável

EXCLUDE_FILES = {'sobre.html', 'index.html', 'brasil-index.html', 'japao-guia_1.html'}

# Mapping arquivo → slug do país (pra coords.json)
def country_slug_from_file(fn):
    # 'portugal-guia.html' → 'portugal'
    # 'brasil-sudeste.html' → 'brasil'
    # 'irlanda-norte-guia.html' → 'irlanda-norte'
    base = fn.replace('.html', '')
    if base.startswith('brasil-'):
        return 'brasil'
    return base.replace('-guia', '')


def slug(name):
    """Mesmo slug usado no HTML."""
    s = name.lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def extract_restaurants_from_html(html, country):
    """Extrai (name, address) de todos os restaurantes num arquivo HTML.

    Lida com 3 formatos:
      Formato 1: {n:'Name', q:'...', a:'Address'}        (Portugal, França, etc.)
      Formato 2: {"n": "Name", "q": "...", "a": "Address"}  (JSON-style com espaços)
      Formato 3: {n:"Name",q:"...",a:"Address"}            (Brasil, Irlanda, etc.)
    """
    results = []
    seen = set()

    # Procura blocos {...} não-aninhados (cada restaurante é flat)
    # Dentro de cada bloco, busca os campos n e a com aspas single OU double
    n_pat = re.compile(r"""["']?n["']?\s*:\s*["']([^"']+(?:\\["'][^"']*)*)["']""")
    a_pat = re.compile(r"""["']?a["']?\s*:\s*["']([^"']+(?:\\["'][^"']*)*)["']""")

    for block_match in re.finditer(r'\{[^{}]+\}', html):
        block = block_match.group(0)
        n_match = n_pat.search(block)
        a_match = a_pat.search(block)
        if n_match and a_match:
            name = n_match.group(1).replace("\\'", "'").replace('\\"', '"')
            addr = a_match.group(1).replace("\\'", "'").replace('\\"', '"')
            key = (name, addr)
            if key not in seen:
                seen.add(key)
                results.append((name, addr, country))

    return results


def geocode(name, address):
    """Chama Nominatim e retorna (lat, lng) ou None."""
    # Tenta com nome + endereço
    query = f"{name}, {address}"
    url = f"https://nominatim.openstreetmap.org/search?q={quote(query)}&format=json&limit=1&addressdetails=0"

    try:
        req = Request(url, headers={'User-Agent': USER_AGENT})
        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except (HTTPError, URLError, ValueError, KeyError) as e:
        print(f"    ⚠ erro: {e}", file=sys.stderr)

    # Fallback: só endereço (sem nome)
    url2 = f"https://nominatim.openstreetmap.org/search?q={quote(address)}&format=json&limit=1&addressdetails=0"
    try:
        time.sleep(1.1)  # Respeita rate limit antes do fallback
        req = Request(url2, headers={'User-Agent': USER_AGENT})
        with urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception:
        pass

    return None


def main():
    print(f"📂 Repositório: {REPO}\n")

    # 1) Coleta todos os restaurantes
    all_restaurants = []
    files = sorted(f for f in os.listdir(REPO)
                   if f.endswith('.html') and f not in EXCLUDE_FILES and 'guia' in f or f.startswith('brasil-'))
    files = [f for f in files if f.endswith('.html') and f not in EXCLUDE_FILES]

    for fn in files:
        path = os.path.join(REPO, fn)
        with open(path, 'r', encoding='utf-8') as f:
            html = f.read()
        country = country_slug_from_file(fn)
        rests = extract_restaurants_from_html(html, country)
        if rests:
            print(f"  {fn:<30} → {len(rests)} restaurantes")
            all_restaurants.extend(rests)

    print(f"\n📊 Total: {len(all_restaurants)} restaurantes a geocodificar\n")

    # 2) Carrega progresso anterior se existir
    coords = {}
    if os.path.exists(COORDS_FILE):
        with open(COORDS_FILE, 'r', encoding='utf-8') as f:
            coords = json.load(f)
        print(f"📥 Encontrado coords.json com {len(coords)} entradas — continuando de onde parou\n")

    # 3) Geocodifica os que ainda não foram processados
    todo = []
    for name, addr, country in all_restaurants:
        key = f"{country}/{slug(name)}"
        if key not in coords:
            todo.append((name, addr, country, key))

    if not todo:
        print("✓ Tudo já geocodificado!")
        return

    print(f"🌍 Faltam {len(todo)} pra geocodificar (estimativa: {len(todo) * 1.2 / 60:.1f} min)\n")

    success = 0
    failed = 0
    start = time.time()

    for i, (name, addr, country, key) in enumerate(todo, 1):
        print(f"[{i:4d}/{len(todo)}] {country}/{name[:50]:<50}", end=' ')
        result = geocode(name, addr)

        if result:
            lat, lng = result
            coords[key] = {
                'name': name,
                'address': addr,
                'country': country,
                'lat': lat,
                'lng': lng,
            }
            success += 1
            print(f"✓ {lat:.5f}, {lng:.5f}")
        else:
            coords[key] = {
                'name': name,
                'address': addr,
                'country': country,
                'lat': None,
                'lng': None,
                'failed': True,
            }
            failed += 1
            print(f"✗ FAIL")

        # Salva a cada 10 entradas (resume se interrompido)
        if i % 10 == 0:
            with open(COORDS_FILE, 'w', encoding='utf-8') as f:
                json.dump(coords, f, ensure_ascii=False, indent=2)

        # Rate limit Nominatim: 1 req/segundo
        time.sleep(1.1)

    # Salva final
    with open(COORDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(coords, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"✓ Geocodificados:  {success}")
    print(f"✗ Falharam:        {failed}")
    print(f"⏱  Tempo:          {elapsed/60:.1f} min")
    print(f"💾 Salvo em:       {COORDS_FILE}")


if __name__ == '__main__':
    main()
