#!/bin/sh
# Copy this repo's mods into Herdr. A real copy, not a symlink: Herdr
# doesn't load a symlinked mod's SVGs or notice its edits. Herdr reloads the mod on its own.
set -e
H="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
cd "$(dirname "$0")/.."
for m in sakamichi/mods/*/; do
  name=$(basename "$m")
  rsync -a --delete --exclude gpui-kit.d.ts --exclude jsconfig.json "$m" "$H/mods/$name/"
  herdr-app check "$H/mods/$name"
done
