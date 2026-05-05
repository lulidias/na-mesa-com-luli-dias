#!/bin/bash
# Script automático: converte HEIC → JPEG, extrai GPS, e renomeia com slug
# do restaurante mais próximo do guia da Argentina.
#
# USO: duplo-click no Finder

cd "$(dirname "$0")"

GUIA="argentina-guia.html"
PASTA="fotos/argentina"

if [ ! -f "$GUIA" ]; then
  echo "ERRO: $GUIA não encontrado"
  exit 1
fi

if [ ! -d "$PASTA" ]; then
  echo "ERRO: pasta $PASTA não encontrada"
  exit 1
fi

echo "════════════════════════════════════════════════"
echo "Auto-Renomear Argentina"
echo "════════════════════════════════════════════════"
echo ""

# 1) Forçar download do iCloud
echo "1/4 — A baixar fotos do iCloud..."
find "$PASTA" -type f \( -iname "*.HEIC" -o -iname "*.heic" -o -iname "IMG_*.jpeg" -o -iname "IMG_*.jpg" \) | while read f; do
  brctl download "$f" 2>/dev/null
done
sleep 3

# 2) Extrair COORDS do guia (Python para parser)
echo ""
echo "2/4 — A ler restaurantes do guia..."
python3 << 'PYEOF' > /tmp/argentina-coords.json
import re, json
with open('argentina-guia.html') as f:
    c = f.read()

# Extrair COORDS = {"argentina/slug": {"name":"...", "lat":X, "lng":Y}, ...}
m = re.search(r'const COORDS\s*=\s*\{(.*?)\};', c, re.DOTALL)
result = {}
if m:
    coords_block = m.group(1)
    # Parsear cada entry
    for em in re.finditer(r'"argentina/([^"]+)"\s*:\s*\{[^}]*?"lat"\s*:\s*([\-\d.]+)\s*,\s*"lng"\s*:\s*([\-\d.]+)', coords_block):
        slug = em.group(1)
        lat = float(em.group(2))
        lng = float(em.group(3))
        result[slug] = (lat, lng)

print(json.dumps(result, indent=2))
PYEOF

N_REST=$(python3 -c "import json; print(len(json.load(open('/tmp/argentina-coords.json'))))")
echo "    $N_REST restaurantes geocodificados encontrados."

# 3) Para cada HEIC: extrair GPS, achar restaurante mais próximo, renomear
echo ""
echo "3/4 — A processar fotos..."

python3 << 'PYEOF'
import json, os, subprocess, re, math, unicodedata
from glob import glob

with open('/tmp/argentina-coords.json') as f:
    coords = json.load(f)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2-lat1)
    dlam = math.radians(lon2-lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2*R*math.asin(math.sqrt(a))

def get_gps_mdls(path):
    """Extrai GPS usando mdls (Spotlight metadata)."""
    try:
        lat = subprocess.check_output(['mdls', '-name', 'kMDItemLatitude', '-raw', path], stderr=subprocess.DEVNULL).decode().strip()
        lng = subprocess.check_output(['mdls', '-name', 'kMDItemLongitude', '-raw', path], stderr=subprocess.DEVNULL).decode().strip()
        if lat and lat != '(null)' and lng and lng != '(null)':
            return (float(lat), float(lng))
    except: pass
    return None

# Processar HEICs e JPEGs sem slug (IMG_*)
pasta = 'fotos/argentina/'
fotos = sorted(glob(f'{pasta}IMG_*.HEIC') + glob(f'{pasta}IMG_*.heic') + glob(f'{pasta}IMG_*.jpeg') + glob(f'{pasta}IMG_*.jpg'))
print(f"    {len(fotos)} fotos sem slug encontradas.")

# Para cada foto, achar restaurante mais próximo
matches = {}  # slug -> [list of fotos]
RAIO_MAX = 500  # metros (raio gerado generoso para capturar fotos próximas, não exatas)

for foto in fotos:
    gps = get_gps_mdls(foto)
    if not gps:
        continue
    lat, lng = gps

    # Achar restaurante mais próximo
    best_slug = None
    best_dist = float('inf')
    for slug, (rlat, rlng) in coords.items():
        d = haversine(lat, lng, rlat, rlng)
        if d < best_dist:
            best_dist = d
            best_slug = slug

    if best_slug and best_dist < RAIO_MAX:
        matches.setdefault(best_slug, []).append(foto)
        print(f"    ✓ {os.path.basename(foto):<25} → {best_slug} ({best_dist:.0f}m)")
    else:
        print(f"    ✗ {os.path.basename(foto):<25} sem match (mais próximo: {best_dist:.0f}m)")

# Salvar resultado
with open('/tmp/argentina-matches.json', 'w') as f:
    json.dump(matches, f, indent=2)

print(f"\n    Total: {sum(len(v) for v in matches.values())} fotos matched para {len(matches)} restaurantes")
PYEOF

# 4) Converter HEIC → JPEG e renomear
echo ""
echo "4/4 — A converter e renomear..."

python3 << 'PYEOF'
import json, os, subprocess, shutil

with open('/tmp/argentina-matches.json') as f:
    matches = json.load(f)

pasta = 'fotos/argentina/'
total_renamed = 0

for slug, fotos_list in matches.items():
    # Numerar: primeiro = slug.jpeg, segundo = slug-2.jpeg, etc.
    for i, foto in enumerate(sorted(fotos_list)):
        n = i + 1
        suffix = '' if n == 1 else f'-{n}'
        novo_jpeg = f'{pasta}{slug}{suffix}.jpeg'
        novo_heic = f'{pasta}{slug}{suffix}{os.path.splitext(foto)[1]}'

        # Pular se já existe destino (evitar overwrite)
        while os.path.exists(novo_jpeg):
            n += 1
            suffix = f'-{n}'
            novo_jpeg = f'{pasta}{slug}{suffix}.jpeg'
            novo_heic = f'{pasta}{slug}{suffix}{os.path.splitext(foto)[1]}'

        # Converter HEIC → JPEG via sips (ou copiar se já é jpeg)
        if foto.lower().endswith(('.heic',)):
            ret = subprocess.run(['sips', '-s', 'format', 'jpeg', '--resampleHeightWidthMax', '1600',
                                  foto, '--out', novo_jpeg],
                                 capture_output=True)
            if ret.returncode == 0 and os.path.exists(novo_jpeg) and os.path.getsize(novo_jpeg) > 1000:
                # Renomear HEIC original também (para preservar)
                shutil.move(foto, novo_heic)
                total_renamed += 1
                print(f"    ✓ {os.path.basename(foto):<25} → {os.path.basename(novo_jpeg)}")
            else:
                print(f"    ✗ falha converter {os.path.basename(foto)}")
        else:
            shutil.move(foto, novo_jpeg)
            total_renamed += 1
            print(f"    ✓ {os.path.basename(foto):<25} → {os.path.basename(novo_jpeg)}")

print(f"\n  ✓ {total_renamed} fotos convertidas e renomeadas!")
PYEOF

echo ""
echo "════════════════════════════════════════════════"
echo "PRONTO!"
echo "════════════════════════════════════════════════"
echo ""
echo "Próximo passo:"
echo "  1. Abre o GitHub Desktop"
echo "  2. Vê os ficheiros renomeados em fotos/argentina/"
echo "  3. Commit + Push"
echo ""
read -p "Carrega Enter para fechar..."
