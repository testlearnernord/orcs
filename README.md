# ORCS — Top-Down Rogue-Lite mit Nemesis-ähnlichem System

Minimaler Startpunkt: Phaser + TypeScript + Vite, plus Simulationskern (Offiziere, Warcalls, Zyklen).
Ziel: prozedurale Offiziersgesellschaft, Spieler ist nur ein weiterer Offizier. Keine Sonderbehandlung.

## Quickstart

```bash
pnpm i   # oder: npm i / yarn
pnpm dev # startet http://localhost:5173
```

Taste **E**: führt einen Simulations-Cycle aus und loggt Ereignisse in die Konsole.

## CI & Format

PRs müssen `npm run format:check` (führt `prettier --check` aus) bestehen; bei lokalen Änderungen `npm run format:write` ausführen. Der GitHub-Pages-Build landet direkt in `docs/`; aktualisiere die Dateien nur, wenn du den veröffentlichten Stand ändern möchtest.

## Portrait-Atlanten

Die Portrait-Komponenten laden einen WebP-Atlas (`officers_atlas.webp`) mit 50 einzigartigen Offiziers-Porträts in einem 10×5 Raster. Das neue modulare System bietet:

- **50 diverse Offiziere** mit unterschiedlichen Geschlechtern, Altersgruppen, Hauttönen (grünliche Ork-Töne) und Ausrüstungen
- **Perfekte Zentrierung** in Rang-Ringen - keine Formatierungsprobleme mehr
- **Modularer Aufbau** für einfache Erweiterung und Wartung
- **Deterministische Zuteilung** basierend auf Offiziers-ID

Standardmäßig versucht der Loader zuerst, die Datei aus dem Pages-Build zu holen (`${import.meta.env.BASE_URL}assets/orcs/portraits/officers_atlas.webp`). Falls nicht verfügbar, greift automatisch ein Fallback auf `raw.githubusercontent.com/testlearnernord/orcs/main/docs/assets/orcs/portraits/` zu.

Für lokale Builds gibt es drei Optionen:

1. **GitHub Pages befüllen:** Lade `officers_atlas.webp` manuell in `docs/assets/orcs/portraits/` hoch.
2. **Lokales Verzeichnis spiegeln:** Lege die Datei unter `local-portraits/` ab. `npm run build` kopiert sie dank `scripts/copy-portraits.mjs` automatisch nach `docs/assets/orcs/portraits/`.
3. **Remote-Fallback nutzen:** Wenn weder Pages noch `local-portraits/` die Datei liefern, lädt die App den Atlas direkt von GitHub (CORS-kompatibel).

Beim Laden werden alle Versuche protokolliert (`window.__orcsPortraitStatus`). Schlägt alles fehl, erscheint eine Silhouette mit `data-art="fallback"` statt eines leeren Platzhalters.
