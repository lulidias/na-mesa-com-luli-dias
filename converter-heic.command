#!/bin/bash
# Conversor universal HEIC/DNG/PNG/HEIF → JPG para o LULI DIAS guide
# Duplo-clica este ficheiro para converter todas as fotos em fotos/hoteis/

cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════════════"
echo "  CONVERSOR DE FOTOS · Luli Dias Guide"
echo "  HEIC · DNG · HEIF · PNG → JPG"
echo "═══════════════════════════════════════════════"
echo ""

CONVERTED=0
FAILED=0

# Encontra todos os ficheiros que precisam conversão
shopt -s nullglob nocaseglob
for src in fotos/hoteis/*.heic fotos/hoteis/*.dng fotos/hoteis/*.heif fotos/hoteis/*.png \
           fotos/hoteis-pending/*.heic fotos/hoteis-pending/*.dng fotos/hoteis-pending/*.heif fotos/hoteis-pending/*.png; do
  if [ ! -f "$src" ]; then
    continue
  fi

  # Output path: mesma pasta, extensão .jpg
  jpg="${src%.*}.jpg"

  # Skip se .jpg já existe e é mais recente
  if [ -f "$jpg" ] && [ "$jpg" -nt "$src" ]; then
    echo "  ⊘ $(basename "$src") — já convertido"
    continue
  fi

  ext_upper=$(echo "${src##*.}" | tr '[:lower:]' '[:upper:]')
  echo "  ⏳ A converter $(basename "$src") [$ext_upper]..."

  if sips -s format jpeg "$src" --out "$jpg" >/dev/null 2>&1; then
    echo "     ✓ $(basename "$jpg")"
    CONVERTED=$((CONVERTED + 1))

    # Opcional: apagar original após sucesso (descomenta se quiseres)
    # rm "$src"
  else
    echo "     ✗ FALHOU (formato pode não ser suportado)"
    FAILED=$((FAILED + 1))
  fi
done

shopt -u nullglob nocaseglob

echo ""
echo "═══════════════════════════════════════════════"
echo "  Convertidas: $CONVERTED"
[ "$FAILED" -gt 0 ] && echo "  Falhas: $FAILED"
echo "═══════════════════════════════════════════════"
echo ""
echo "Formatos suportados:"
echo "  ✓ HEIC / HEIF (iPhone)"
echo "  ✓ DNG (RAW Adobe)"
echo "  ✓ PNG (screenshots)"
echo ""
echo "Próximos passos:"
echo "  1. Verifica se as fotos novas estão em fotos/hoteis/"
echo "  2. Renomeia cada .jpg para o slug do hotel (ex: belmond-copacabana-palace.jpg)"
echo "  3. GitHub Desktop → Commit → Push"
echo ""
echo "Pressiona Enter para fechar esta janela..."
read
