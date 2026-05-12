#!/bin/sh
set -e

mkdir -p ./data

if [ "${ENABLE_CALL_SCANNER:-true}" = "true" ]; then
  echo "[start] launching call scanner..."
  node call-scanner.js &
fi

echo "[start] launching scanner..."
exec node scanner.js
