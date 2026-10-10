#!/bin/sh
# Regenerates the store graphics and the launcher icon from src/*.svg.
set -e
cd "$(dirname "$0")"

rsvg-convert -w 144 -h 144 src/icon.svg -o icon-large.png
rsvg-convert -w 80 -h 80 src/icon.svg -o icon-small.png

# librsvg will not load ../screenshots, so the screen is composited at 1:1 here.
rsvg-convert -w 720 -h 320 src/banner.svg |
	magick - screenshots/emery_4_steep.png -geometry +445+46 -composite -strip banner.png

# Binary alpha, and transparent pixels kept white so nothing palettises them into the black.
rsvg-convert -w 25 -h 25 src/menu-icon.svg |
	magick -size 25x25 xc:black \( - -alpha extract -threshold 50% \) \
		-alpha off -compose CopyOpacity -composite -background white -alpha background -strip \
		PNG32:../resources/img/menu-icon.png
