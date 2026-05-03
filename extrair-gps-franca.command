#!/bin/bash
# Extrai GPS de todas as fotos em ~/Desktop/fotos-franca-export
# Inclui HEIC, JPG, PNG. Usa `mdls` (Spotlight metadata) — built-in do macOS.
# Gera ~/Desktop/franca-gps.json com {filename: [lat, lng]}.

cd "$(dirname "$0")"

EXPORT_DIR="$HOME/Desktop/fotos-franca-export"
OUT_JSON="$HOME/Desktop/franca-gps.json"

if [ ! -d "$EXPORT_DIR" ]; then
  echo "ERRO: pasta $EXPORT_DIR não existe"
  exit 1
fi

echo "A processar fotos em $EXPORT_DIR..."
TOTAL=$(ls "$EXPORT_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "Total de ficheiros: $TOTAL"
echo ""

count=0
ok=0
nogps=0

# Cabeçalho do JSON
echo "{" > "$OUT_JSON"
first=1

for f in "$EXPORT_DIR"/*; do
  [ -f "$f" ] || continue
  count=$((count+1))

  # mdls extrai metadados do Spotlight (rápido, sem ler o ficheiro inteiro)
  lat=$(mdls -name kMDItemLatitude -raw "$f" 2>/dev/null)
  lng=$(mdls -name kMDItemLongitude -raw "$f" 2>/dev/null)

  if [ "$lat" = "(null)" ] || [ -z "$lat" ] || [ "$lng" = "(null)" ] || [ -z "$lng" ]; then
    nogps=$((nogps+1))
  else
    name=$(basename "$f")
    if [ $first -eq 1 ]; then
      first=0
    else
      echo "," >> "$OUT_JSON"
    fi
    # Escapa o nome do ficheiro (substitui " por \")
    name_esc=$(echo "$name" | sed 's/"/\\"/g')
    printf '  "%s": [%s, %s]' "$name_esc" "$lat" "$lng" >> "$OUT_JSON"
    ok=$((ok+1))
  fi

  # Progresso a cada 500
  if [ $((count % 500)) -eq 0 ]; then
    echo "  ... $count / $TOTAL processados (com GPS: $ok)"
  fi
done

echo "" >> "$OUT_JSON"
echo "}" >> "$OUT_JSON"

echo ""
echo "=========================================="
echo "PRONTO!"
echo "Total processados: $count"
echo "Com GPS:            $ok"
echo "Sem GPS:            $nogps"
echo ""
echo "Resultado em: $OUT_JSON"
echo ""
echo "Próximo passo: arrastar este ficheiro pro chat com o Claude."
echo ""
read -p "Carrega Enter para fechar..."
