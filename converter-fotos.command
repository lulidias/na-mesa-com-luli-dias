#!/bin/bash
# Converte todos os DNG/HEIC/HEIF de TODAS as pastas dentro de fotos/
# para JPEG (máx 1200px, qualidade 72) e apaga os originais após conversão.
# Funciona seja onde for executado (Desktop, Finder, etc.)
#
# USO: duplo-click no Finder

# Caminho fixo para o repositório (independente de onde o script está)
REPO="/Users/lulidias/Library/Mobile Documents/com~apple~CloudDocs/Documents/GitHub/na-mesa-com-luli-dias"
cd "$REPO"

echo "════════════════════════════════════════════════"
echo "Conversor de fotos — Na Mesa com Luli Dias"
echo "════════════════════════════════════════════════"
echo ""

# 1) Forçar download de TUDO em fotos/ do iCloud
echo "1. A garantir que todas as fotos estão baixadas do iCloud..."
find fotos/ -type f \( -iname "*.DNG" -o -iname "*.HEIC" -o -iname "*.HEIF" -o -iname "*.heic" -o -iname "*.dng" -o -iname "*.heif" \) | while read f; do
  brctl download "$f" 2>/dev/null
done
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
deleted=0

convert_file() {
  local src="$1"
  local base="${src%.*}"
  local dst="${base}.jpeg"

  # Se já existe .jpeg ou .jpg não-vazio, pular
  if [ -f "${base}.jpeg" ] && [ -s "${base}.jpeg" ]; then
    skip=$((skip+1))
    return
  fi
  if [ -f "${base}.jpg" ] && [ -s "${base}.jpg" ]; then
    skip=$((skip+1))
    return
  fi

  if sips -s format jpeg -s formatOptions 72 --resampleHeightWidthMax 1200 "$src" --out "$dst" >/dev/null 2>&1; then
    if [ -f "$dst" ] && [ -s "$dst" ]; then
      ok=$((ok+1))
      echo "  ✓ $(basename "$dst")"
      # Apagar original após conversão bem-sucedida
      rm -f "$src"
      deleted=$((deleted+1))
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

# Converter em TODAS as subpastas de fotos/
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
echo "  ✓ Convertidos:      $ok"
echo "  🗑 Originais apagados: $deleted"
echo "  ⊘ Já existentes:   $skip"
echo "  ✗ Falhas:           $fail"
echo "════════════════════════════════════════════════"
echo ""
echo "Próximo passo: abre o Claude Code e diz 'subi fotos novas'"
echo ""
read -p "Carrega Enter para fechar esta janela..."
