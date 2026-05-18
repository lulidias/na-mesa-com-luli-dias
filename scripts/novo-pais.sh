#!/usr/bin/env bash
# Uso: bash scripts/novo-pais.sh <pasta-fotos>
# Exemplo: bash scripts/novo-pais.sh italia
#
# Cria fotos/<pasta>/ e adiciona ao sparse-checkout local para que
# podes arrastar fotos lá e fazer commit via GitHub Desktop.

set -e

FOLDER="${1}"

if [ -z "$FOLDER" ]; then
  echo "Uso: bash scripts/novo-pais.sh <pasta-fotos>"
  echo "Exemplo: bash scripts/novo-pais.sh italia"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1. Adiciona ao sparse-checkout para que a pasta fique visível localmente
git sparse-checkout set --no-cone '/*' '!/fotos/' \
  $(git sparse-checkout list | grep '^/fotos/' | tr '\n' ' ') \
  "/fotos/${FOLDER}/"

# 2. Cria a pasta com placeholder
mkdir -p "fotos/${FOLDER}"
touch "fotos/${FOLDER}/.gitkeep"

# 3. Staged
git add "fotos/${FOLDER}/.gitkeep"

echo ""
echo "✓ fotos/${FOLDER}/ criada e adicionada ao sparse-checkout"
echo "✓ .gitkeep staged — faz commit e push via GitHub Desktop"
echo ""
echo "Próximos passos:"
echo "  1. Abre o GitHub Desktop → vai ver 1 ficheiro alterado (.gitkeep)"
echo "  2. Faz commit e push"
echo "  3. Arrasta as fotos para fotos/${FOLDER}/ no Finder"
echo "  4. GitHub Desktop deteta as fotos → commit e push"
