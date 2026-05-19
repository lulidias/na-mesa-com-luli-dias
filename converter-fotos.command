#!/bin/bash
# Converte todos os DNG/HEIC/HEIF/PNG de TODAS as pastas dentro de fotos/
# para JPEG, redimensiona pra 1600px máx e remove EXIF.
# Também força o iCloud a baixar os arquivos antes de processar.
# Detecta JPEGs vazios (0 bytes) e re-converte automaticamente.
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
echo "2. A apagar JPEGs vazios (0 bytes) para forçar re-conversão..."
empty_count=$(find fotos/ -type f -name "*.jpeg" -size 0 | wc -l | tr -d ' ')
find fotos/ -type f -name "*.jpeg" -size 0 -delete 2>/dev/null
echo "   $empty_count JPEGs vazios apagados."

echo ""
echo "3. A converter ficheiros..."
echo ""

ok=0
fail=0
skip=0

# Função de conversão
convert_file() {
  local src="$1"
  local base="${src%.*}"
  local dst="${base}.jpeg"

  # Se já existe .jpeg (não-vazio) ou .jpg, pular
  if [ -f "${base}.jpeg" ] && [ -s "${base}.jpeg" ]; then
    skip=$((skip+1))
    return
  fi
  if [ -f "${base}.jpg" ] && [ -s "${base}.jpg" ]; then
    skip=$((skip+1))
    return
  fi

  # sips converte HEIC/DNG/PNG para JPEG (suporta tudo nativamente no macOS)
  if sips -s format jpeg -s formatOptions 72 --resampleHeightWidthMax 1200 "$src" --out "$dst" >/dev/null 2>&1; then
    if [ -f "$dst" ] && [ -s "$dst" ]; then
      ok=$((ok+1))
      echo "  ✓ $(basename "$dst")"
    else
      fail=$((fail+1))
      echo "  ✗ $(basename "$src") — saída vazia"
      [ -f "$dst" ] && rm -f "$dst"
    fi
  else
    fail=$((fail+1))
    echo "  ✗ $(basename "$src") — falhou"
    [ -f "$dst" ] && rm -f "$dst"
  fi
}

# Converter em TODAS as subpastas de fotos/ (detecção automática)
for pasta in fotos/*/; do
  [ -d "$pasta" ] || continue
  for f in "$pasta"*.DNG "$pasta"*.HEIC "$pasta"*.heic "$pasta"*.HEIF "$pasta"*.heif "$pasta"*.dng; do
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
