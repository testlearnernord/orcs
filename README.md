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

Die Portrait-Komponenten laden zwei WebP-Atlanten (`set_a.webp`, `set_b.webp`). Standardmäßig versucht der Loader zuerst, die Dateien aus dem Pages-Build zu holen (`${import.meta.env.BASE_URL}assets/orcs/portraits/…`). Falls sie dort fehlen, greift automatisch ein Fallback auf `raw.githubusercontent.com/testlearnernord/orcs/main/docs/assets/orcs/portraits/`.

Für lokale Builds gibt es drei Optionen:

1. **GitHub Pages befüllen:** Lade `set_a.webp` und `set_b.webp` manuell in `docs/assets/orcs/portraits/` hoch.
2. **Lokales Verzeichnis spiegeln:** Lege die Dateien unter `local-portraits/` ab. `npm run build` kopiert sie dank `scripts/copy-portraits.mjs` automatisch nach `docs/assets/orcs/portraits/`.
3. **Remote-Fallback nutzen:** Wenn weder Pages noch `local-portraits/` die Dateien liefern, lädt die App die Atlanten direkt von GitHub (CORS-kompatibel).

Für visuelle Checks lässt sich eine Gitter-Überlagerung aktivieren: Setze `localStorage['art.debugGrid'] = '1'`, und jeder geslicte Ausschnitt zeichnet dünne Linien auf das Ergebnis.

Beim Laden werden alle Versuche protokolliert (`window.__orcsPortraitStatus`). Schlägt alles fehl, erscheint eine Silhouette mit `data-art="fallback"` statt eines leeren Platzhalters.
