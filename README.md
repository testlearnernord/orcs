# ORCS — Top-Down Rogue-Lite (Experimenteller Prototyp)

**Status:** Dieses Projekt befindet sich in einem sehr frühen, experimentellen Stadium („Pre-Alpha"). Alle Spielmodi und Features sind Prototypen und können sich stark ändern oder fehlerhaft sein.

<!-- PROJEKTZIEL_START -->

## Projektziel

ORCS simuliert eine prozedurale Gesellschaft von Offizieren mit zufallsgenerierten Ereignissen und dynamischen Beziehungen. Der Spieler ist dabei – langfristig – nur ein Offizier unter vielen, ohne Sonderrolle. Das Projekt dient als technische Spielwiese für prozedurale Simulation, KI-Interaktion und visuelles Prototyping.

<!-- PROJEKTZIEL_END -->

<!-- QUICKSTART_START -->

## Quickstart

```bash
pnpm i   # oder: npm i / yarn
pnpm dev # startet http://localhost:5173
```

<!-- QUICKSTART_END -->

<!-- MODI_START -->

## Spielmodi (alle experimentell)

- **Spectate Mode**: `?mode=spectate`  
  Beobachte die KI-gesteuerte Offiziersgesellschaft.
  Taste **E**: Führt einen Simulations-Cycle aus und loggt Ereignisse in die Konsole.
- **Player Mode**: `?mode=player`  
  Spiele als Offizier, interagiere mit der Welt und KI (rudimentär, unfertig!).
- **Free-Roam Mode**: `?mode=freeRoam`  
  Erkunde eine feste, von Copilot generierte Map mit unterschiedlichen Biomen.

### Free-Roam: Biome &amp; Map

- Eine feste Karte mit diversen Biomen (Wüste, Wald, Gebirge, etc.) ist hinterlegt.
- Steuerung: WASD (Spielerbewegung), Klick (Pathfinding), F2 (Debug-Overlay), ESC (Menü), Mausrad (Zoom), Drag (Kamera).
<!-- MODI_END -->

<!-- FEATURES_START -->

## Features (automatisch generiert)

- Dynamische Offiziersbewegung und KI-Verhalten
- Prozedural generierte Ereignisse („Warcalls")
- Verschiedene Biome mit Echtzeit-Wechsel
- Eine feste, automatisch generierte Karte (keine handgefertigten Maps)
- Einfache Portraits/Avatare (PNG-Format)
- Experimentelle Echtzeit-Kämpfe und Simulationen
<!-- FEATURES_END -->

<!-- TECHNISCHES_START -->

## Technisches &amp; Build

- CI prüft Code-Formatierung (`npm run format:check` mit Prettier)
- Assets (Portraits, Karten) liegen im PNG-Format vor
- Portraits werden direkt aus PNG-Dateien geladen
<!-- TECHNISCHES_END -->

<!-- MITARBEIT_START -->

## Mitarbeit &amp; Feedback

Dieses Projekt ist offen für Experimente, Pull Requests und Diskussionen – aber erwartet keine Stabilität oder fertigen Content!  
Feature-Vorschläge und Probleme bitte als GitHub Issue melden.

<!-- MITARBEIT_END -->

---

© 2025 testlearnernord/orcs
