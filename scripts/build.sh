#!/bin/bash
mkdir -p ./dist
gnome-extensions pack \
    --extra-source ./mumblePing.js \
    --extra-source ./icons \
    --podir ./po \
    -o dist \
    --force