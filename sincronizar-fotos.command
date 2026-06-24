#!/bin/bash
# Sincroniza fotos novas para o site — duplo-click no Finder para usar
# Converte DNG/HEIC, ignora screenshots e ficheiros inválidos, faz commit e push.

REPO="/Users/lulidias/Library/Mobile Documents/com~apple~CloudDocs/Documents/GitHub/na-mesa-com-luli-dias"
cd "$REPO"

echo "════════════════════════════════════════════════"
echo "Sincronizador de fotos — Na Mesa com Luli Dias"
echo "════════════════════════════════════════════════"
echo ""

# 1) Forçar download do iCloud
echo "1. A garantir que as fotos estão no Mac..."
find fotos/ -type f \( -iname "*.DNG" -o -iname "*.HEIC" -o -iname "*.HEIF" -o -iname "*.png" -o -iname "*.PNG" \) | while read f; do
  brctl download "$f" 2>/dev/null
done
sleep 3

# 2) Converter DNG/HEIC/PNG novos (sem JPEG correspondente)
echo "2. A converter ficheiros novos..."
converted=0
for f in fotos/*/*.DNG fotos/*/*.HEIC fotos/*/*.heic fotos/*/*.HEIF fotos/*/*.heif fotos/*/*.dng fotos/*/*.png fotos/*/*.PNG; do
  [ -f "$f" ] || continue
  base="${f%.*}"
  dst="${base}.jpeg"
  if [ -f "$dst" ] && [ -s "$dst" ]; then continue; fi
  if sips -s format jpeg -s formatOptions 72 --resampleHeightWidthMax 1200 "$f" --out "$dst" >/dev/null 2>&1; then
    if [ -s "$dst" ]; then
      rm -f "$f"
      converted=$((converted+1))
      echo "   ✓ $(basename "$dst")"
    fi
  fi
done
[ $converted -eq 0 ] && echo "   Nada novo para converter."

# 3) Detectar ficheiros problemáticos (screenshots, nomes com espaços)
echo ""
echo "3. A verificar ficheiros com nomes inválidos..."
bad=0
while IFS= read -r -d '' f; do
  name=$(basename "$f")
  # Ignorar ficheiros com "Captura", "Ver as fotos", ou espaços no nome
  if echo "$name" | grep -qiE "captura de tela|ver as fotos|screenshot"; then
    echo "   ⚠️  Ignorado (nome inválido): $name"
    bad=$((bad+1))
  fi
done < <(find fotos/ -type f -name "*.jpeg" -o -name "*.jpg" -print0 2>/dev/null)

# 4) Verificar se há fotos novas para subir
echo ""
echo "4. A verificar fotos novas..."

# Adicionar apenas JPEGs válidos (sem espaços no caminho problemáticos)
new_files=$(git ls-files --others --exclude-standard fotos/ | grep -iE "\.(jpeg|jpg)$" | grep -viE "captura de tela|ver as fotos|screenshot")
modified=$(git diff --name-only fotos/ | grep -iE "\.(jpeg|jpg)$")

if [ -z "$new_files" ] && [ -z "$modified" ]; then
  echo "   Não há fotos novas para subir."
  echo ""
  echo "════════════════════════════════════════════════"
  echo "Tudo já está atualizado!"
  echo "════════════════════════════════════════════════"
  echo ""
  read -p "Carrega Enter para fechar..."
  exit 0
fi

count=$(echo "$new_files" | grep -c . 2>/dev/null || echo 0)
echo "   $count foto(s) nova(s) encontrada(s)."
echo ""

# 5) Adicionar e fazer commit
echo "5. A subir para o site..."

# Adicionar ficheiros válidos
echo "$new_files" | while read f; do
  [ -z "$f" ] && continue
  git add "$f"
done
echo "$modified" | while read f; do
  [ -z "$f" ] && continue
  git add "$f"
done

# Verificar se há algo para commitar
if git diff --cached --quiet; then
  echo "   Nada para commitar."
else
  timestamp=$(date "+%d/%m/%Y %H:%M")
  git commit -m "sincronizar fotos — $timestamp" -q
  # Retry pull+push até 4 vezes (o iCloud pode commitar entre pulls)
  published=0
  for attempt in 1 2 3 4; do
    git pull --rebase -q 2>/dev/null || { git rebase --abort 2>/dev/null; continue; }
    if git push -q 2>/dev/null; then
      echo "   ✓ Fotos publicadas! O site atualiza em ~1 minuto."
      published=1; break
    fi
  done
  [ $published -eq 0 ] && echo "   ❌ Erro ao publicar. Abre o GitHub Desktop e faz Sync."
fi

echo ""
echo "════════════════════════════════════════════════"
[ $bad -gt 0 ] && echo "⚠️  $bad ficheiro(s) ignorado(s) por nome inválido."
echo "Feito!"
echo "════════════════════════════════════════════════"
echo ""
read -p "Carrega Enter para fechar..."
