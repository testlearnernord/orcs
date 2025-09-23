# Portrait-Pipeline (Nemesis-Hof)

Die aktuelle Oberfläche lädt zwei Portrait-Atlanten (`set_a.webp`, `set_b.webp`) ohne Manifest-HTTP-Fetch. Stattdessen liegen die relevanten Informationen im Code und werden beim Build ausgewertet. Dadurch verschwinden die früheren 404-Fehler auf GitHub Pages.

## Maßnahmenübersicht

| Fundstelle                                               | Maßnahme |
| -------------------------------------------------------- | -------- |
| `src/ui/portraits/config.ts`                             | Definiert Base-Pfad, Remote-Fallback und Set-Metadaten (Cols/Rows, Gewichtung, Tags). |
| `src/ui/portraits/loader.ts`                             | Lädt Atlanten sequentiell, protokolliert `tried/ok/failed` und cached Ergebnisse ohne Mehrfach-Logs. |
| `src/features/portraits/Avatar.tsx`                      | Arbeitet mit den neuen Loader-Daten, setzt deterministisch Tiles und zeigt bei Fehlern eine Silhouette (`data-art="fallback"`). |
| `src/features/portraits/preload.ts`                      | Triggert optional einen frühen Load, ohne zusätzliche Fetches im Fehlerfall zu spammen. |
| `scripts/copy-portraits.mjs`                             | Kopiert lokale Atlanten aus `local-portraits/` nach `docs/assets/orcs/portraits/` vor dem Build. |
| `scripts/check-portraits.mjs`                            | CI-Check: stellt sicher, dass `docs/assets/` nach dem Build existiert. |
| `scripts/guards/ensure-portrait-dist.mjs`                | Build-Guard: bricht ab, falls `docs/assets` fehlt. |
| `README.md`                                              | Dokumentiert lokale vs. Remote-Fallbacks und die neue Lade-Logik. |

## Neuer Ablauf

1. `config.ts` berechnet aus `import.meta.env.BASE_URL` die lokalen Asset-URLs und ergänzt Remote-Fallbacks von GitHub.
2. `loader.ts` versucht für jedes Set zuerst den lokalen Pfad (`/orcs/assets/orcs/portraits/*.webp`), danach den Remote-Origin. Bei Erfolg landet der Status unter `window.__orcsPortraitStatus`.
3. `OfficerAvatar` nimmt die geladenen Atlanten, wählt anhand der Offiziers-ID deterministisch Set/Tile und rendert sie als CSS-Background.
4. Fehlen alle Atlanten, zeigt der Avatar eine Silhouette mit `data-art="fallback"`; bei lokalem Legacy-Toggle (`localStorage['art.active']='legacy'`) wird `data-art="legacy"` gesetzt.

## Varianten zum Auffüllen der Atlanten

- **Remote only:** Nichts weiter nötig – die App lädt über `raw.githubusercontent.com`.
- **Docs-Verzeichnis pflegen:** Lade die `.webp`-Dateien direkt in `docs/assets/orcs/portraits/`.
- **Lokale Quelle:** Lege die Dateien in `local-portraits/` ab; `npm run build` kopiert sie automatisch dank `prebuild`-Script.

## Erweiterung

- Zusätzliche Sets: `config.ts` um neue Einträge (ID, Dateiname, Raster, Gewichtung) erweitern.
- Tags/Gewichtung: Pro Set im Definition-Objekt `tags` oder `weight` setzen; `OfficerAvatar` filtert über `requireTag` weiterhin sauber.
