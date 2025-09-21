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

PRs müssen `npm run format:check` (führt `prettier --check` aus) bestehen; bei lokalen Änderungen `npm run format:write` ausführen. Keine Builds/Assets in PRs commiten.

## Portrait-Atlanten

Portrait-Atlanten werden automatisch erkannt, wenn unter `public/assets/orcs/portraits/` Dateien `set_a.webp`, `set_b.webp` liegen.
Avatare nutzen ausschließlich diese Atlanten; eine Versionsnummer sorgt dafür, dass neue Builds die Browser-Caches aktualisieren.
CI prüft via `npm run guard:portraits`, dass keine alten Generator-Imports mehr eingebunden werden.
