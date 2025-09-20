# ORCS — Top-Down Rogue-Lite mit Nemesis-ähnlichem System

Minimaler Startpunkt: Phaser + TypeScript + Vite, plus Simulationskern (Offiziere, Warcalls, Zyklen).
Ziel: prozedurale Offiziersgesellschaft, Spieler ist nur ein weiterer Offizier. Keine Sonderbehandlung.

## Quickstart

```bash
pnpm i   # oder: npm i / yarn
pnpm dev # startet http://localhost:5173
```

Taste **E**: führt einen Simulations-Cycle aus und loggt Ereignisse in die Konsole.

## Portrait-Atlanten

Portrait-Atlanten unter `public/assets/orcs/portraits/` (z. B. `set_a.webp`, `set_b.webp`) werden automatisch erkannt.
Builds für Pages bitte lokal ausführen; CI/PR committed keine `docs/`-Assets.
