#!/bin/bash
set -e
line="----------------------------------------"
echo $line
echo "Cleanup"
echo $line
rm ./dist/*.zip || exit 0
mkdir -p ./dist
echo "Building Extension ZIP"
echo $line
gnome-extensions pack \
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