#!/bin/bash
# Conversor de HEIC → JPG para o LULI DIAS guide
# Duplo-clica este ficheiro para converter todas as fotos HEIC em fotos/hoteis/

cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════════════"
echo "  CONVERSOR HEIC → JPG · Luli Dias Guide"
echo "═══════════════════════════════════════════════"
echo ""

CONVERTED=0
FAILED=0

for heic in fotos/hoteis/*.HEIC fotos/hoteis/*.heic fotos/hoteis-pending/*.HEIC fotos/hoteis-pending/*.heic; do
  if [ ! -f "$heic" ]; then
    continue
  fi

  # Output path: same folder, .jpg extension
  jpg="${heic%.*}.jpg"

  # Skip if jpg already exists and is newer
  if [ -f "$jpg" ] && [ "$jpg" -nt "$heic" ]; then
    echo "  ⊘ $(basename "$heic") — já convertido"
    continue
  fi

  echo "  ⏳ A converter $(basename "$heic")..."

  if sips -s format jpeg "$heic" --out "$jpg" >/dev/null 2>&1; then
    echo "     ✓ $(basename "$jpg")"
    CONVERTED=$((CONVERTED + 1))

    # Optionally remove original HEIC after successful conversion
    # rm "$heic"  # uncomment se quiseres apagar HEIC depois de converter
  else
    echo "     ✗ FALHOU"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  Convertidas: $CONVERTED"
[ "$FAILED" -gt 0 ] && echo "  Falhas: $FAILED"
echo "═══════════════════════════════════════════════"
echo ""
echo "Próximos passos:"
echo "  1. Verifica se as fotos novas estão em fotos/hoteis/"
echo "  2. Renomeia cada uma para o slug do hotel (ex: belmond-copacabana-palace.jpg)"
echo "  3. GitHub Desktop → Commit → Push"
echo ""
echo "Pressiona Enter para fechar esta janela..."
read
