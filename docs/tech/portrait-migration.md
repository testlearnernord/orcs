# Portrait-Migration (Nemesis-Hof)

Die Nemesis-Oberfläche setzt ab sofort ausschließlich auf manifest-getriebene Portrait-Sprite-Sheets. Legacy-Generatoren, Base64-Kataloge und Ad-hoc-Konfigurationen wurden entfernt, um künftige Portrait-Sets nur über Manifest-Einträge aktivieren zu müssen.

## Maßnahmenübersicht

| Fundstelle | Maßnahme |
| --- | --- |
| `public/assets/orcs/portraits/manifest.json` | Sprite-Sheet-Quellen auf relative Pfade gestellt; BASE_URL entscheidet nun über das Laufzeit-Präfix. |
| `src/features/portraits/manifest.ts` | Loader ersetzt: lädt Manifest über `BASE_URL`, normalisiert Gewichte und cached das Ergebnis. |
| `src/features/portraits/preload.ts` | Preload nutzt `fetch` direkt auf das Manifest und resolved Sprite-Quellen über `BASE_URL`, lädt Images `async/eager`. |
| `src/ui/Portrait.tsx` | Wrapper zwingt alle Aufrufer durch `OfficerAvatar` und fällt deterministisch auf `officer.id`, falls `stableId` leer ist. |
| `src/features/portraits/__tests__/avatar.smoke.test.tsx` | Test-Mock auf relative Pfade gedreht und prüft explizit auf `set_a.webp`/`set_b.webp`. |
| `scripts/guards/portrait-manifest.mjs` | Guard akzeptiert relative Quellen und prüft weiter auf gültige Raster/Dateien. |
| `scripts/guards/assert-no-legacy-portraits.mjs` | Neuer Build-Guard, der Repository-Scans auf Altpfade/Legacy-Funktionen erzwingt. |
| `.gitignore` | WebP-Dateien in die Binär-Blockliste aufgenommen, damit kein neuer Raster-Müll eingecheckt wird. |
| `package.json` Scripts | `guard:portraits` startet die Legacy-Prüfung vor CI/Build, Deploy-Skripte bleiben unverändert. |

## Neuer Ablauf

1. `public/assets/orcs/portraits/manifest.json` listet alle aktiven Portrait-Sets samt Raster (cols, rows, optional margin/padding, weight, tags).
2. `OfficerAvatar` lädt das Manifest einmalig, wählt deterministisch pro Offiziers-`stableId` Set & Tile und cropt per CSS (inkl. margin/padding-Unterstützung via Bilddimensionen).
3. `preloadPortraitSheets()` lädt sämtliche Sprite-Sheets vorab, damit UI-Karten ohne Flackern erscheinen.
4. Neue Sets werden durch Manifest-Erweiterungen aktiviert; kein Quellcode-Refactor erforderlich.

## Erweiterung

- Weitere Sets hinzufügen: `manifest.json` um `{ id, src, cols, rows, weight?, tags?, margin?, padding? }` erweitern.
- Gewichtung feinjustieren: `weight` (z. B. 0.5 oder 2) beeinflusst die Tile-Verteilung.
- Fraktionen/Ränge segmentieren: `tags` hinterlegen und über `<OfficerAvatar requireTag="..." />` filtern.
