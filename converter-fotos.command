#!/bin/bash
# Converte todos os DNG/HEIC/HEIF/PNG das pastas fotos/peru, fotos/liechtenstein,
# fotos/hoteis para JPEG, redimensiona pra 1600px máx e remove EXIF.
# Também força o iCloud a baixar os arquivos antes de processar.
#
# USO: duplo-click no Finder

cd "$(dirname "$0")"

echo "════════════════════════════════════════════════"
echo "Conversor de fotos — Na Mesa com Luli Dias"
echo "════════════════════════════════════════════════"
echo ""

# 1) Forçar download de TUDO em fotos/ (incluindo JPG, PNG, HEIC, DNG, etc)
echo "1. A garantir que todas as fotos estão baixadas do iCloud..."
find fotos/ -type f \( -iname "*.DNG" -o -iname "*.HEIC" -o -iname "*.HEIF" -o -iname "*.heic" -o -iname "*.dng" -o -iname "*.jpg" -o -iname "*.JPG" -o -iname "*.jpeg" -o -iname "*.JPEG" -o -iname "*.png" -o -iname "*.PNG" \) | while read f; do
  brctl download "$f" 2>/dev/null
done

# Aguardar download terminar
sleep 4

echo ""
echo "2. A converter ficheiros..."
echo ""

ok=0
fail=0
skip=0

# Função de conversão
convert_file() {
  local src="$1"
  local base="${src%.*}"
  local dst="${base}.jpeg"

  # Se já existe .jpeg ou .jpg, pular
  if [ -f "${base}.jpeg" ] || [ -f "${base}.jpg" ]; then
    skip=$((skip+1))
    return
  fi

  # sips converte HEIC/DNG/PNG para JPEG (suporta tudo nativamente no macOS)
  if sips -s format jpeg --resampleHeightWidthMax 1600 "$src" --out "$dst" >/dev/null 2>&1; then
    if [ -f "$dst" ] && [ -s "$dst" ]; then
      ok=$((ok+1))
      echo "  ✓ $(basename "$dst")"
    else
      fail=$((fail+1))
      echo "  ✗ $(basename "$src") — saída vazia"
    fi
  else
    fail=$((fail+1))
    echo "  ✗ $(basename "$src") — falhou"
  fi
}

# Converter em todas as pastas relevantes
for pattern in \
  "fotos/peru/*.DNG" "fotos/peru/*.HEIC" "fotos/peru/*.heic" \
  "fotos/liechtenstein/*.DNG" "fotos/liechtenstein/*.HEIC" "fotos/liechtenstein/*.heic" \
  "fotos/hoteis/*.DNG" "fotos/hoteis/*.HEIC" "fotos/hoteis/*.heic"; do
  for f in $pattern; do
    [ -f "$f" ] || continue
    convert_file "$f"
  done
done

echo ""
echo "════════════════════════════════════════════════"
echo "Resultado:"
echo "  ✓ Convertidos:   $ok"
echo "  ⊘ Já existentes: $skip"
echo "  ✗ Falhas:        $fail"
echo "════════════════════════════════════════════════"
echo ""
echo "Próximo passo:"
echo "  1. Abre o GitHub Desktop"
echo "  2. Vais ver os novos .jpeg na lista de Changes"
echo "  3. Commit + Push"
echo ""
read -p "Carrega Enter para fechar esta janela..."
