#!/usr/bin/env bash
set -euo pipefail
mkdir -p dist
# Lista explícita: publica somente código de leitura e pacote cifrado.
for file in index.html style.css app.js studies.js reading.js locked-book.js icon.svg manifest.webmanifest sw.js book.lock; do
  test -f "$file" || { echo "Arquivo necessário ausente: $file" >&2; exit 1; }
  cp -- "$file" "dist/$file"
done
# Nunca copiar a fonte privada, scripts, testes, credenciais nem outros arquivos.
printf '%s\n' "Publicado somente os 10 arquivos permitidos em dist/"
if grep -rq "O movimento alemão pela liberdade" dist; then
  echo "ERRO: conteúdo literário legível detectado." >&2
  exit 1
fi
