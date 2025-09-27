# Audio Credits

This file documents all audio assets used in the Nemesis Hof project.

## Background Music

### Track 1: "Curse of the Witches"

- **Artist:** Jimena Contreras
- **File:** `public/audio/curse-of-the-witches-jimena-contreras.mp3`
- **Usage:** Background music for atmospheric gameplay
- **License:** [Please specify license/attribution requirements]
- **Source:** [Please specify source/website]

### Track 2: "Whirlpool"

- **Artist:** The Mini Vandals
- **File:** `public/audio/whirlpool-the-mini-vandals.mp3`
- **Usage:** Background music for dynamic gameplay
- **License:** [Please specify license/attribution requirements]
- **Source:** [Please specify source/website]

## Sound Effects

_None currently implemented_

---

## Attribution Notes

- All music tracks are used in accordance with their respective licenses
- For license inquiries or attribution corrections, please create an issue
- When adding new audio assets, update this file with proper attribution

## Technical Details

- Audio files are served from `docs/audio/` and `public/audio/` directories
- Build process automatically copies audio files from `src/assets/audio/` or `local-audio/`
- Supported formats: MP3, WAV, OGG
- Audio system handles preloading and crossfading between tracks
- Graceful fallback when audio files are missing - displays single warning instead of console spam
- Volume and playback controls available in the game UI

### Adding Audio Files

**Current Status**: The repository contains minimal placeholder audio files to prevent 404 errors. These are silent, very small MP3 files that serve as placeholders.

To add the actual audio files:

1. **For development**: Replace the placeholder files in `src/assets/audio/` directory with real MP3 files
2. **For local override**: Place MP3 files in `local-audio/` directory (takes precedence)
3. **Required files**:
   - `curse-of-the-witches-jimena-contreras.mp3`
   - `whirlpool-the-mini-vandals.mp3`

The build process will automatically copy these files to the correct locations (`docs/audio/` and `public/audio/`).

**Note**: The current placeholder files are minimal silent audio files created to prevent console errors. Replace them with actual licensed music files according to the attribution requirements above.
