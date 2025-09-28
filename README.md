# ORCS — Top-Down Rogue-Lite mit Nemesis-ähnlichem System

Minimaler Startpunkt: Phaser + TypeScript + Vite, plus Simulationskern (Offiziere, Warcalls, Zyklen).
Ziel: prozedurale Offiziersgesellschaft, Spieler ist nur ein weiterer Offizier. Keine Sonderbehandlung.

## Quickstart

```bash
pnpm i   # oder: npm i / yarn
pnpm dev # startet http://localhost:5173
```

Taste **E**: führt einen Simulations-Cycle aus und loggt Ereignisse in die Konsole.

## Game Modi

- **Spectate Mode**: `?mode=spectate` - Standardmodus zum Beobachten der Simulation
- **Player Mode**: `?mode=player` - Direktes Spielen als Offizier (experimentell)
- **Free-Roam Mode**: `?mode=freeRoam` - Erkunde eine prozedural generierte Welt mit vielfältigen Biomen
  - **Procedurally Generated**: Standard - diverse Biome-Welten (Wüste, Wiese, Wald, Sumpf, Schnee, Savanne, Strand, Berge, Dschungel, Vulkan, Aschelande, Flüsse)
  - **Handcrafted Maps**: `?mode=freeRoam&map=mapname` - Erkunde handgefertigte Karten

### Free-Roam Diverse Biomes (Default)

Der Free-Roam Modus generiert standardmäßig eine vielfältige Welt mit 12 verschiedenen Biomen:

- **Wüste** (Desert) - Trockene, sandige Gebiete
- **Wiese** (Plains) - Grüne Grasländer
- **Wald** (Forest) - Dichte Waldgebiete
- **Sumpf** (Swamp) - Feuchte Moorlandschaften
- **Schnee** (Tundra) - Gefrorene, eisige Regionen
- **Savanne** (Savanna) - Afrikanische Graslandschaften
- **Strand** (Beach) - Küstengebiete
- **Berge** (Mountains) - Hochgebirgsregionen
- **Dschungel** (Jungle) - Tropische Regenwälder
- **Vulkan** (Volcano) - Aktive Vulkangebiete
- **Aschelande** (Ashwastes) - Verbrannte Ödländer
- **Flüsse** (Rivers) - Wasserwege und Seen

**Features:**

- Dynamische Offiziersbewegung mit KI-Verhalten
- Prozedural generierte Warcalls
- Echtzeit-Biomenwechsel
- WASD-Steuerung für Spielerbewegung
- 768x768 große Karten mit 25 Offizieren

### Free-Roam Handcrafted Maps

Der Free-Roam Modus unterstützt auch handgefertigte Karten mit folgender Struktur:

```
src/assets/maps/{map-id}/
├── terrain.png     # Hintergrundkarte (Grafik)
├── collision.png   # Kollisionsmaske (schwarz/transparent = blockiert, weiß = begehbar)
└── meta.json       # Konfiguration (Spawns, POIs, Kamera-Einstellungen)
```

#### Hand-Maps erstellen

1. **Gleiche Pixelgröße**: `terrain.png` und `collision.png` müssen identische Abmessungen haben
2. **32px Tile-Raster**: Verwende ein 32-Pixel-Raster für optimale Kollisionserkennung
3. **Kollisionsmaske**:
   - Schwarz (RGB < 50) oder transparent (Alpha = 0) = blockiert
   - Weiß oder helle Farben = begehbar
4. **meta.json** Beispiel:
   ```json
   {
     "name": "Deine Karte",
     "pixelSize": { "width": 2048, "height": 1536 },
     "tileSize": 32,
     "camera": { "minZoom": 0.75, "maxZoom": 1.75, "startZoom": 1.05 },
     "spawns": {
       "player": { "x": 1024, "y": 768 },
       "officers": [{ "x": 500, "y": 400 }]
     },
     "pois": [{ "id": "landmark", "x": 1200, "y": 600, "label": "Landmark" }]
   }
   ```

#### Controls im Free-Roam

- **Klick**: Bewege Spieler zum angeklickten Punkt (mit A\* Pathfinding)
- **F2**: Debug-Overlay ein/ausschalten (zeigt Kollisionsflächen)
- **ESC**: Zurück zum Hauptmenü
- **Mausrad**: Zoom
- **Drag**: Kamera bewegen

## CI & Format

PRs müssen `npm run format:check` (führt `prettier --check` aus) bestehen; bei lokalen Änderungen `npm run format:write` ausführen. Der GitHub-Pages-Build landet direkt in `docs/`; aktualisiere die Dateien nur, wenn du den veröffentlichten Stand ändern möchtest.

## Portrait-Atlanten

Die Portrait-Komponenten laden zwei WebP-Atlanten (`set_a.webp`, `set_b.webp`). Standardmäßig versucht der Loader zuerst, die Dateien aus dem Pages-Build zu holen (`${import.meta.env.BASE_URL}assets/orcs/portraits/…`). Falls sie dort fehlen, greift automatisch ein Fallback auf `raw.githubusercontent.com/testlearnernord/orcs/main/docs/assets/orcs/portraits/`.

Für lokale Builds gibt es drei Optionen:

1. **GitHub Pages befüllen:** Lade `set_a.webp` und `set_b.webp` manuell in `docs/assets/orcs/portraits/` hoch.
2. **Lokales Verzeichnis spiegeln:** Lege die Dateien unter `local-portraits/` ab. `npm run build` kopiert sie dank `scripts/copy-portraits.mjs` automatisch nach `docs/assets/orcs/portraits/`.
3. **Remote-Fallback nutzen:** Wenn weder Pages noch `local-portraits/` die Dateien liefern, lädt die App die Atlanten direkt von GitHub (CORS-kompatibel).

Beim Laden werden alle Versuche protokolliert (`window.__orcsPortraitStatus`). Schlägt alles fehl, erscheint eine Silhouette mit `data-art="fallback"` statt eines leeren Platzhalters.
