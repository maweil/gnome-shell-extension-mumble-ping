#!/bin/bash
mkdir -p ./lint
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/.eslintrc.yml
cd lint
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/lint/eslintrc-gjs.yml
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/lint/eslintrc-shell.yml
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/main/lint/eslintrc-legacy.yml