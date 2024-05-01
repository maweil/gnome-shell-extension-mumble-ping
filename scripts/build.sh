#!/bin/bash
set -e
line="----------------------------------------"
echo $line
echo "Cleanup"
echo $line
rm ./dist/*.zip || echo "Nothing to cleanup!"
mkdir -p ./dist
echo "Building Extension ZIP"
echo $line
npx -p typescript tsc \
&& npm run format \
&& gnome-extensions pack \
    --extra-source ./mumblePing.js \
    --extra-source ./icons \
    --podir ./po \
    -o dist \
    --force
echo "Removing compiled settings schema (not allowed for GNOME 45)"
echo $line
zip -d dist/mumble-ping*.zip "/schemas/gschemas.compiled"
echo $line
echo "Done!"