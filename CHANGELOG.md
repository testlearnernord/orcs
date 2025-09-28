## [0.8.3] - 2025-01-27

### Fixed

- **SPECTATE Simulation UI Updates**: Fixed issue where UI cards/lanes were not updating after cycle advances due to state immutability problem
- Added `version` and `updatedAt` fields to WorldState for better change tracking
- GameStore now creates new state references after each cycle to ensure UI reactivity
- Added reactivity tests to prevent regression

### Technical

- Modified `advanceCycle()` to properly increment version and timestamp
- Updated `GameStore.tick()` to create new state references for UI updates
- Added debug logging for development (`?debugWorld=1` URL parameter)
- New test: `store.reactivity.spec.ts` validates state reference changes

## [0.8.2] - 2025-01-27

### Added

- **Player Mode Combat Sandbox**: Interactive combat system accessible via `?mode=player`
- Three unified orc archetypes: Archer, Berserker, Trapper with unique signature moves
- Real-time combat with movement (WASD), dash (Shift), block (Ctrl), lock-on (Alt), and signature moves (E)
- Stamina system with regeneration delays and action costs
- Test Arena with basic enemy AI and wave mechanics
- Combat systems: hitbox detection, health management, projectiles, and stagger
- Player controller with 8-directional movement, dash i-frames, and directional blocking
- Lock-on system for targeting enemies within forward cone
- Player Mode HUD showing stamina, cooldowns, archetype info, and controls
- Archetype adapter for mapping existing data to unified combat system
- `npm run dev:player` and `npm run test:player` scripts
- Comprehensive documentation in `docs/PLAYER_MODE.md`

### Changed

- Enabled `PLAYER_MODE` feature flag
- UI root system extended to support Player Mode alongside Spectate and Free Roam modes
- Spectate and Free Roam modes remain unchanged and fully functional

### Technical

- Modular player mode architecture under `src/playerMode/`
- Combat systems in `src/combat/` for hitbox, health, and projectiles
- Simulation layer with unified archetypes in `src/simulation/`
- No breaking changes to existing systems or APIs

## [0.8.1] - 2025-09-22

### Added

- `npm run guard:portraits` kontrolliert die neue Portrait-Konfiguration (`src/ui/portraits/config.ts`) und blockiert Legacy-Rückfälle.

### Fixed

- GitHub-Pages-Build lädt Portrait-Atlanten zuverlässig (Fallback auf raw.githubusercontent.com) und protokolliert Ladeversuche nur noch einmal.

## [0.8.0] - 2025-09-19

### Added

- Manifest-gestützte Portrait-Pipeline mit `<OfficerAvatar>` und Vorab-Ladevorgang für Sprite-Sheets. Siehe [notes/portrait-migration.md](notes/portrait-migration.md).
- Tests für Hash-Mapping und Avatar-Rendering mit dem neuen Manifest.

### Changed

- Nemesis-Hof nutzt nur noch die Sprite-Sheets `set_a.webp` und `set_b.webp`, Auswahl erfolgt deterministisch über `stableId`.
- Build-/Deploy-Skripte für GitHub Pages auf `rimraf` + `dist`-Copy umgestellt.

### Removed

- Legacy-Portrait-Generator, Base64-Kataloge und Guard-Skripte gegen alte Orc-Assets.
- Verwaiste Asset-Pfade (`assets/orc/**`, `src/config/art.ts`, `src/features/portraits/atlas.ts`, `src/sim/portraits.ts`).

## [0.7.0] - 2025-09-18

### Fixed

- Whitescreen & 404 durch fehlerhafte Vite-Config und falschen Entry
- Merge-Konflikte bereinigt, CI wieder grün

=======

### Changed

- Geklärte Projektstruktur (sim/ui/state/bootstrap)
- Statisches Pages-Setup (base:'/orcs/', outDir:'docs')
- DOM-Mounting mit minimaler UI (ranks + feed)

### Removed

- Handgeschriebene docs/index.html, veraltete Helpers, Duplikate

## [0.6.1] - 2025-09-18

### Fixed

- Bereinigte Merge-Konflikte in UI/Build-Dateien
- Stabiler Pages-Build (base:'/orcs/', outDir:'docs')
- Root-Redirect postbuild, Prettier grün

### Changed

- Vereinheitlichter DOM-Mount in NemesisUI und main.ts

## [1.0.0] - 2025-09-18

### Added

- Vollständige Nemesis-Mechaniken (Traits, Persönlichkeit, Beziehungen, Blood Oath, König-Status)
- 80 einzigartige Offiziersgrafiken via Layer-Generator
- Tooltip-Breakdown für Warcall-Chancen
- Scrollbarer Friedhof
- Memories-System
- Feed-Satzfabrik mit Story-Einträgen
- CI, Husky, Prettier, EditorConfig

### Fixed

- Textüberlappungen im Feed/Details
- „Danebenklicken“-Bug bei Offizieren
- Zyklus-Reihenfolge (Tode → Spawns → Promotions)

### Changed

- Sim/UI-Architektur neu strukturiert
- UI-Rang-Sektionen mit festen Depths
