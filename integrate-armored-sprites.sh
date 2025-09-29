#!/bin/bash

# Script to integrate the armored berserker sprites provided by @testlearnernord
# This script should be run after downloading the ZIP file from the GitHub comment

set -e

echo "🛡️ Integrating Armored Berserker Sprites"
echo "========================================="

# Check if ZIP file exists
if [ ! -f "lpc_male_item_animations_2025-09-29T16-10-56.zip" ]; then
    echo "❌ Error: Please download the ZIP file from the GitHub comment first"
    echo "   Expected file: lpc_male_item_animations_2025-09-29T16-10-56.zip"
    exit 1
fi

# Create backup of current naked sprites
echo "📦 Creating backup of current naked sprites..."
mkdir -p src/assets/battlesystem/berserker/backup-naked-original
cp src/assets/battlesystem/berserker/standard/*.png src/assets/battlesystem/berserker/backup-naked-original/

# Extract the armored sprites
echo "📂 Extracting armored sprites..."
unzip -o "lpc_male_item_animations_2025-09-29T16-10-56.zip" -d /tmp/armored-extraction/

# Copy armored sprites to the standard directory
echo "🛡️ Installing armored sprites..."
ARMORED_DIR="/tmp/armored-extraction"
BERSERKER_DIR="src/assets/battlesystem/berserker/standard"

# Core animations needed for the game
ANIMATIONS=("walk" "idle" "slash" "run" "hurt")

for animation in "${ANIMATIONS[@]}"; do
    if [ -f "${ARMORED_DIR}/${animation}.png" ]; then
        echo "   ✅ Installing armored ${animation}.png"
        cp "${ARMORED_DIR}/${animation}.png" "${BERSERKER_DIR}/${animation}.png"
    else
        echo "   ⚠️  Warning: ${animation}.png not found in armored sprites"
    fi
done

# Copy any additional animations that exist
echo "🔍 Checking for additional animations..."
for file in "${ARMORED_DIR}"/*.png; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ ! -f "${BERSERKER_DIR}/${filename}" ]; then
            echo "   ➕ Adding additional animation: ${filename}"
            cp "$file" "${BERSERKER_DIR}/${filename}"
        fi
    fi
done

# Update docs directory (for web deployment)
echo "🌐 Updating web assets..."
cp src/assets/battlesystem/berserker/standard/*.png docs/assets/battlesystem/berserker/standard/

# Verify the sprites
echo "🔍 Verifying armored sprites..."
for animation in "${ANIMATIONS[@]}"; do
    if [ -f "${BERSERKER_DIR}/${animation}.png" ]; then
        size=$(file "${BERSERKER_DIR}/${animation}.png" | grep -o '[0-9]\+ x [0-9]\+')
        echo "   ✅ ${animation}.png: ${size}"
    fi
done

echo ""
echo "🎉 SUCCESS: Armored berserker sprites installed!"
echo ""
echo "Next steps:"
echo "1. Build the project: npm run build"
echo "2. Test the character in game to verify armor is visible"
echo "3. Commit the changes if everything looks correct"
echo ""
echo "The berserker should now display with:"
echo "- Bronze plate shoulders"
echo "- Copper arms/feet armor"
echo "- Gray chainmail torso"
echo "- Waraxe weapon"
echo "- Green orc base"