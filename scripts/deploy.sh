#!/bin/bash
extension_name="mumble-ping@maweil.github.com"
./scripts/build.sh
gnome-extensions install -f "./dist/${extension_name}.shell-extension.zip"