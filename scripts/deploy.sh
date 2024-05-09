#!/bin/bash
set -e
extension_name="mumble-ping@maweil.github.com"
extension_path="./dist/${extension_name}.shell-extension.zip"
if [ ! -f "$extension_path" ]
then
    ./scripts/build.sh
fi
gnome-extensions install -f "$extension_path"