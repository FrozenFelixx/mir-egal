#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js ist nicht installiert. Bitte Node.js LTS installieren: https://nodejs.org'
  exit 1
fi
printf '\nMIR EGAL startet auf http://localhost:3000\n\n'
node server.js
