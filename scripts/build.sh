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
echo "Done!"