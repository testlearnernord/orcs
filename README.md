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

Aktive Portrait-Sets werden manifest-gesteuert. `public/assets/orcs/portraits/manifest.json` listet alle verfügbaren Sprite-Sheets samt Rasterinformationen. Neue Sets werden ausschließlich über dieses Manifest aktiviert; der Code muss dafür nicht angepasst werden.

Die Komponente `<OfficerAvatar>` schneidet die benötigten Tiles per CSS aus den WebP-Sheets (`set_a.webp`, `set_b.webp`). Beim App-Start werden alle im Manifest gelisteten Sheets vorab geladen, um leere Kartenansichten zu vermeiden.

> **Hinweis:** Für statische Deployments auf GitHub Pages muss jede Asset-URL mit `import.meta.env.BASE_URL` zusammengesetzt werden. Nur so landen Requests auf `https://<user>.github.io/orcs/...` statt auf der falschen Root-URL. Siehe [GitHub Pages – Project Sites](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#project-sites).
