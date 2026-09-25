#!/usr/bin/env bash
# PROTOTYPE: rebuild every GLB for the art-style-gag prototype (Blender 5.2 LTS, headless).
set -euo pipefail
cd "$(dirname "$0")"
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
OUT=../../../../public/proto/art-style-gag
mkdir -p "$OUT"
run() { "$BLENDER" -b --factory-startup --python-exit-code 1 --python "$@" >/dev/null 2>&1 || { echo "FAILED: $*"; exit 1; }; }
for v in A B C; do
  run tarnished.py -- "$v" "$OUT/tarnished_$v.glb" &
  run margit.py -- "$v" "$OUT/margit_$v.glb" &
done
run arena.py -- "$OUT/arena.glb" &
wait
ls -la "$OUT"
