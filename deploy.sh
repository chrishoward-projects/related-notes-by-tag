#!/bin/bash

# Deploy script for Related Notes by Tag plugin
# Copies built files to active Obsidian vault

USER_HOME="$HOME"
SOURCE_DIR="$USER_HOME/Obsidian/Development/.obsidian/plugins/related-notes-by-tag"
TARGET_DIR="$USER_HOME/Obsidian/APRIL/.obsidian/plugins/related-notes-by-tag"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy files
cp "$SOURCE_DIR/main.js" "$TARGET_DIR/"
cp "$SOURCE_DIR/manifest.json" "$TARGET_DIR/"
cp "$SOURCE_DIR/styles.css" "$TARGET_DIR/"

echo "Plugin files deployed to $TARGET_DIR"