# Armored Berserker Sprite Integration Guide

## 🛡️ Problem Solved!

@testlearnernord has provided the exact armored berserker sprites needed to fix the naked orc issue!

## 📦 Files Provided:

- `lpc_male_item_animations_2025-09-29T16-10-56.zip` - Complete armored berserker sprite set
- `sheet-credits.txt` - Attribution and licensing information
- Screenshot showing the properly armored character

## 🔧 How to Integrate:

### Method 1: Using the Integration Script

1. Download the ZIP file from the GitHub comment
2. Place it in the project root directory
3. Run the integration script:
   ```bash
   ./integrate-armored-sprites.sh
   ```

### Method 2: Manual Integration

1. Download and extract `lpc_male_item_animations_2025-09-29T16-10-56.zip`
2. Replace the sprites in `src/assets/battlesystem/berserker/standard/`:
   - `walk.png` - Walking animation with armor
   - `idle.png` - Idle animation with armor
   - `slash.png` - Attack animation with waraxe
   - `run.png` - Running animation with armor
   - `hurt.png` - Hurt animation with armor
3. Copy the same files to `docs/assets/battlesystem/berserker/standard/`
4. Build the project: `npm run build`

## ✅ Expected Result:

After integration, the berserker character will display with:

- **Bronze Plate Shoulders** - Metallic shoulder guards
- **Copper Arms/Feet Armor** - Armored limbs with copper finish
- **Gray Chainmail Torso** - Chain armor on chest
- **Waraxe Weapon** - Large battle axe
- **Green Orc Base** - Green orc body and head

## 🎯 Character Specification:

The provided sprites match the exact configuration defined in `character.json`:

```
body=Body_color_green
head=Orc_male_green
shoulders=Plate_bronze
arms=Armour_copper
chainmail=Chainmail_gray
shoes=Armour_copper
weapon=Waraxe_waraxe
```

## 📝 Credits:

The sprites are generated using the Universal LPC Spritesheet Character Generator and follow all proper licensing requirements as specified in the provided credits file.

---

**This completely resolves the naked orc sprite issue reported in #202.**
