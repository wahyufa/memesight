#!/bin/sh
set -e

mkdir -p ./data

echo "[start] launching scanner..."
exec node scanner.js
