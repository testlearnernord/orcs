# Portrait-Pipeline (Nemesis-Hof) - V2 Modular System

Das neue modulare Portrait-System lädt einen einzigen WebP-Atlas (`officers_atlas.webp`) mit 50 einzigartigen, prozedural generierten Offiziers-Porträts. Die neue Architektur eliminiert alle bisherigen Zentrierung- und Formatierungsprobleme.

## Neue System-Merkmale

- **50 diverse Offiziere** in 10×5 Raster (1280×640px)
- **Perfekte Zentrierung** - Gesichter sind prozedural zentriert, keine Feinabstimmung nötig
- **Echte Vielfalt**: Geschlecht, Alter, Hauttöne (grünliche Ork-Farben), Gesichtsstrukturen, Rüstungen
- **Modularer Aufbau** mit komponenten-basierter Generierung
- **Kleinere Dateigröße** (~150KB vs. ~7MB vorher)
- **Deterministische Zuteilung** basierend auf Offiziers-ID bleibt erhalten

## Maßnahmenübersicht

| Fundstelle                                | Status | Änderung                                                                                                                        |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/portraits/config.ts`              | ✅ NEU   | Definiert neuen `officers_v2` Atlas (10×5 Raster) mit Tags für Filterung.                                                     |
| `src/features/portraits/Avatar.tsx`       | ✅ NEU   | Vereinfachte Positionierungslogik - keine Feinabstimmung nötig, da Gesichter pre-zentriert sind.                              |
| `officers_atlas.webp`                     | ✅ NEU   | Neuer modular generierter Atlas mit 50 einzigartigen Offiziers-Porträts.                                                      |
| `set_a.webp` / `set_b.webp`               | ❌ ENT.  | Alte Atlanten entfernt - ersetzt durch modulares System.                                                                      |
| Tests                                     | ✅ UPD   | Aktualisiert für neues Portrait-Set `officers_v2`.                                                                             |
| `scripts/copy-portraits.mjs`              | ✅ BEST. | Kopiert neue Atlas-Datei aus `local-portraits/` nach `docs/assets/orcs/portraits/` vor dem Build.                              |
| `README.md`                               | ✅ UPD   | Dokumentiert neues modulares System und dessen Vorteile.                                                                       |

## Neuer Ablauf

1. **Single Atlas**: Nur noch eine Datei (`officers_atlas.webp`) statt zwei
2. **Perfekte Zentrierung**: Gesichter sind bereits zentriert generiert
3. **Skalierungsfaktor 1.0**: Keine Überskalierung nötig
4. **Pixelated Rendering**: Für schärfere Darstellung optimiert
5. **Deterministische Auswahl**: Basiert weiterhin auf Hash der Offiziers-ID

## Varianten zum Auffüllen des Atlas

- **Remote only:** Nichts weiter nötig – die App lädt über `raw.githubusercontent.com`.
- **Docs-Verzeichnis pflegen:** Lade `officers_atlas.webp` direkt in `docs/assets/orcs/portraits/`.
- **Lokale Quelle:** Lege die Datei in `local-portraits/` ab; `npm run build` kopiert sie automatisch dank `prebuild`-Script.

## Erweiterung

- **Zusätzliche Porträts**: Generator-Script kann einfach erweitert werden (mehr Reihen/Spalten)
- **Neue Eigenschaften**: Modular generierte Komponenten (Narben, Schmuck, verschiedene Helme)
- **Tags/Gewichtung**: System unterstützt weiterhin Filterung über `requireTag`

Das neue System ist vollständig rückwärtskompatibel mit der bestehenden Portrait-API und bietet eine solide Grundlage für zukünftige Erweiterungen.
