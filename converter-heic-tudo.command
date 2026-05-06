#!/bin/bash
# Conversão automática HEIC/HEIF → JPEG em TODAS as pastas de fotos
# USO: duplo-click no Finder
#
# Trata também:
# - Renomear donde-augusto → d-onde-augusto (slug correto Chile)
# - Remove HEICs depois de converter

cd "$(dirname "$0")"

if [ ! -d "fotos" ]; then
  echo "ERRO: pasta 'fotos' não encontrada"
  exit 1
fi

echo "════════════════════════════════════════════"
echo "Conversão HEIC → JPEG · Todas as pastas"
echo "════════════════════════════════════════════"
echo ""

# Renomear donde-augusto → d-onde-augusto no Chile (slug correto)
if [ -d "fotos/chile" ]; then
  cd fotos/chile
  for f in donde-augusto*.HEIC donde-augusto*.heic donde-augusto*.jpeg; do
    [ -e "$f" ] || continue
    novo=$(echo "$f" | sed 's/donde-augusto/d-onde-augusto/')
    mv "$f" "$novo"
    echo "↪ Chile: $f → $novo"
  done
  cd ../..
fi

total=0
ok=0

# Loop por TODAS as pastas em fotos/
for dir in fotos/*/; do
  for f in "$dir"*.HEIC "$dir"*.heic; do
    [ -e "$f" ] || continue
    total=$((total+1))
    base="${f%.*}"
    jpeg="${base}.jpeg"

    if [ -f "$jpeg" ]; then
      rm -f "$f"
      ok=$((ok+1))
      continue
    fi

    if sips -s format jpeg --resampleHeightWidthMax 1600 "$f" --out "$jpeg" >/dev/null 2>&1; then
      if [ -f "$jpeg" ] && [ $(stat -f%z "$jpeg") -gt 10000 ]; then
        rm -f "$f"
        echo "✓ $(basename $f) → $(basename $jpeg)"
        ok=$((ok+1))
      else
        echo "✗ $(basename $f): conversão falhou"
      fi
    else
      echo "✗ $(basename $f): sips falhou"
    fi
  done
done

echo ""
echo "════════════════════════════════════════════"
echo "Resultado: $ok/$total convertidos"
echo "════════════════════════════════════════════"
echo ""
echo "Próximo passo:"
echo "  1. GitHub Desktop"
echo "  2. Commit + Push (⌘P)"
echo ""
read -p "Carrega Enter para fechar..."
