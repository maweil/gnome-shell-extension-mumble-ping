#!/bin/bash
mkdir -p ./lint
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/master/.eslintrc.yml
cd lint
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/master/lint/eslintrc-gjs.yml
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/master/lint/eslintrc-shell.yml
wget https://gitlab.gnome.org/GNOME/gnome-shell/-/raw/master/lint/eslintrc-legacy.yml