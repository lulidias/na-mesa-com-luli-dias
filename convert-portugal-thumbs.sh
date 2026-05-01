#!/bin/bash
# Converte as fotos do Portugal que deram match a thumbnails JPEG
# Usa o `sips` (built-in macOS) — sem dependências externas
# Resultado: ~/Imagens/portugal-review/ com JPEGs pequenos pra review

set -e

SOURCE="$HOME/Desktop/fotos-portugal-export"  # mudar se a pasta tiver espaço inicial
DEST="$HOME/Pictures/portugal-review"
THUMBS="$DEST/thumbs"
MATCHES="$(dirname "$0")/photo_matches.json"

# Detectar se a pasta tem espaço no início (problema do iCloud)
if [ ! -d "$SOURCE" ] && [ -d "$HOME/Desktop/ fotos-portugal-export" ]; then
    SOURCE="$HOME/Desktop/ fotos-portugal-export"
fi
if [ ! -d "$SOURCE" ] && [ -d "$HOME/Pictures/ fotos-portugal-export" ]; then
    SOURCE="$HOME/Pictures/ fotos-portugal-export"
fi
if [ ! -d "$SOURCE" ]; then
    echo "❌ Não achei a pasta do export. Ajusta a variável SOURCE no topo do script."
    exit 1
fi

if [ ! -f "$MATCHES" ]; then
    echo "❌ Não achei photo_matches.json em $MATCHES"
    echo "   Copia-o de outputs/photo_matches.json (na pasta de outputs do Claude)"
    exit 1
fi

echo "📂 Source: $SOURCE"
echo "📂 Destino: $THUMBS"
mkdir -p "$THUMBS"

# Extract list of matched files from JSON usando python (Mac tem)
TOTAL=$(python3 -c "import json; d=json.load(open('$MATCHES')); print(sum(len(v) for v in d.values()))")
echo "🔢 Total de fotos a converter: $TOTAL"

i=0
python3 -c "
import json
d = json.load(open('$MATCHES'))
for restaurant, photos in d.items():
    for p in photos:
        print(p['file'])
" | while read -r FILE; do
    i=$((i+1))
    SRC="$SOURCE/$FILE"
    DST="$THUMBS/${FILE%.*}.jpg"
    if [ -f "$SRC" ]; then
        if [ ! -f "$DST" ]; then
            sips -s format jpeg -Z 1200 "$SRC" --out "$DST" >/dev/null 2>&1
        fi
        if [ $((i % 25)) -eq 0 ]; then
            echo "  $i/$TOTAL convertidas..."
        fi
    else
        echo "  ⚠ falta: $FILE"
    fi
done

echo ""
echo "✅ Pronto! Thumbnails em: $THUMBS"
echo ""
echo "Próximo passo: avisa o Claude que terminou. Ele vai gerar uma página de review."
