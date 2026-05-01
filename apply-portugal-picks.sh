#!/bin/bash
# Aplica as escolhas de portugal-picks.json:
# - Converte cada HEIC/DNG/JPG escolhido a JPEG (largura máx 2000px)
# - Salva em fotos/portugal/<slug>/1.jpeg, 2.jpeg, ... (carrossel)
# - Copia a primeira foto para fotos/portugal/<slug>.jpeg (backward compat)

set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
PICKS="$REPO/portugal-picks.json"
SOURCE_DEFAULT="$HOME/Desktop/fotos-portugal-export"
DEST="$REPO/fotos/portugal"

# Auto-detect source folder (handle leading-space variations)
for try in "$HOME/Desktop/fotos-portugal-export" "$HOME/Desktop/ fotos-portugal-export" "$HOME/Pictures/fotos-portugal-export" "$HOME/Pictures/ fotos-portugal-export"; do
  if [ -d "$try" ]; then SOURCE="$try"; break; fi
done

if [ -z "$SOURCE" ]; then
  echo "❌ Não achei a pasta de exportação. Procurei em:"
  echo "   ~/Desktop/fotos-portugal-export"
  echo "   ~/Pictures/fotos-portugal-export"
  exit 1
fi

if [ ! -f "$PICKS" ]; then
  echo "❌ Não achei portugal-picks.json"
  exit 1
fi

echo "📂 Source: $SOURCE"
echo "📂 Destino: $DEST"
echo ""

# Process each restaurant + photo
python3 -c "
import json
d = json.load(open('$PICKS'))
for slug, files in d.items():
    for i, f in enumerate(files):
        print(f'{slug}\t{i+1}\t{f}')
" | while IFS=$'\t' read -r SLUG NUM FILE; do
  SRC="$SOURCE/$FILE"
  DEST_DIR="$DEST/$SLUG"
  DEST_FILE="$DEST_DIR/${NUM}.jpeg"

  if [ ! -f "$SRC" ]; then
    echo "  ⚠ falta: $FILE"
    continue
  fi

  mkdir -p "$DEST_DIR"

  # Convert with sips: max 2000px largest dim, JPEG quality high
  if sips -s format jpeg -s formatOptions high -Z 2000 "$SRC" --out "$DEST_FILE" >/dev/null 2>&1; then
    echo "  ✓ $SLUG/${NUM}.jpeg ($(basename $FILE))"
    # If first photo, also copy as <slug>.jpeg (backward compat)
    if [ "$NUM" = "1" ]; then
      cp "$DEST_FILE" "$DEST/${SLUG}.jpeg"
    fi
  else
    echo "  ✗ ERRO: $FILE → $DEST_FILE"
  fi
done

echo ""
echo "✅ Pronto! Fotos em $DEST"
echo ""
echo "Estrutura criada:"
ls -la "$DEST" | grep ^d | head -10
