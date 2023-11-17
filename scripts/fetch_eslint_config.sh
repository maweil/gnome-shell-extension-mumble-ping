#!/bin/bash
mkdir -p ./lint
wget -O .eslintrc.yml https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/.eslintrc.yml
cd lint
wget -O eslintrc-gjs.yml https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/lint/eslintrc-gjs.yml
wget -O eslintrc-shell.yml https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/lint/eslintrc-shell.yml