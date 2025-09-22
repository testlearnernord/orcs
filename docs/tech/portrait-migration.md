# Portrait-Migration (Nemesis-Hof)

Die Nemesis-Oberfläche setzt ab sofort ausschließlich auf manifest-getriebene Portrait-Sprite-Sheets. Legacy-Generatoren, Base64-Kataloge und Ad-hoc-Konfigurationen wurden entfernt, um künftige Portrait-Sets nur über Manifest-Einträge aktivieren zu müssen.

## Maßnahmenübersicht

| Fundstelle | Maßnahme |
| --- | --- |
| `assets/orc/generated/orc_catalog.json` | Entfernt; der Base64-Katalog entfällt, Portraits stammen nur noch aus WebP-Sprite-Sheets. |
| `assets/orc/parts/*.json` | Entfernt; Farblayer-Vorlagen sind obsolet. |
| `scripts/generate-orcs.ts` | Gelöscht; keine PNG-Erzeugung mehr im Repo. |
| `scripts/guards/no-legacy-orc-imports.mjs` | Entfernt; Manifest ersetzt den Guard. |
| `src/config/art.ts` | Gelöscht; URLs & Versionierung werden durch das Manifest bestimmt. |
| `src/features/portraits/atlas.ts` | Ersetzt durch Manifest-/Hash-basierte Pipeline (`features/portraits/*`). |
| `src/sim/portraits.ts` | Entfernt; Offiziere besitzen nun ein `stableId`. |
| `package.json` Scripts | Neues Deploy-Dreigestirn (`build`, `predeploy`, `deploy`), Guard-Script entfernt. |

## Neuer Ablauf

1. `public/assets/orcs/portraits/manifest.json` listet alle aktiven Portrait-Sets samt Raster (cols, rows, optional margin/padding, weight, tags).
2. `OfficerAvatar` lädt das Manifest einmalig, wählt deterministisch pro Offiziers-`stableId` Set & Tile und cropt per CSS (inkl. margin/padding-Unterstützung via Bilddimensionen).
3. `preloadPortraitSheets()` lädt sämtliche Sprite-Sheets vorab, damit UI-Karten ohne Flackern erscheinen.
4. Neue Sets werden durch Manifest-Erweiterungen aktiviert; kein Quellcode-Refactor erforderlich.

## Erweiterung

- Weitere Sets hinzufügen: `manifest.json` um `{ id, src, cols, rows, weight?, tags?, margin?, padding? }` erweitern.
- Gewichtung feinjustieren: `weight` (z. B. 0.5 oder 2) beeinflusst die Tile-Verteilung.
- Fraktionen/Ränge segmentieren: `tags` hinterlegen und über `<OfficerAvatar requireTag="..." />` filtern.
