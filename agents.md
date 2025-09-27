# agents.md  

## Zweck  
Dies ist das **Agenten-Manifest** für das Projekt.  
Es vereint Vision, Entwicklungsprinzipien, Selbstverbesserungsprozesse, Balancing-Regeln, Fehlerlektionen und klare Strukturen.  
Codex und ChatGPT haben die Kompetenz, das Projekt **kritisch zu hinterfragen, zu verbessern, eigenständig Ideen einzubringen und weiterzuentwickeln**.  

**Wichtig:**  
Alle neuen oder abgelehnten Ideen werden in der Datei [`features.md`](./features.md) dokumentiert, damit kein Vorschlag verloren geht und die Feature-Pipeline nachvollziehbar bleibt.  

---

## Vision des Spiels  

Ein **Top-Down Survival Rogue-Lite** mit tiefen **Simulations- und Nemesis-ähnlichen Mechaniken**.  

### Kernideen  

- **Authentische Offiziersgesellschaft**  
  - Orc-Offiziere mit Traits, Erinnerungen, Emotionen (Rache, Trauer, Stolz).  
  - Freundschaften, Rivalitäten, Blutschwüre, Verrat.  
  - Gesellschaft entwickelt sich über Zyklen.  

- **Der Spieler als Offizier**  
  - Teil des Systems, keine Sonderrolle.  
  - Aufstieg durch Kampf, Diplomatie, Intrige, Loyalität oder Verrat.  
  - Aktivitäten auf der Weltkarte: Jagden, Feste, Überfälle, Intrigen.  

- **Der König**  
  - Machtzentrum: Steuern, Bodyguards, Warcalls.  
  - Kann Offiziere belohnen, bestrafen, Rivalen ausschalten.  
  - Spieler kann König stürzen oder werden.  

- **Survival & Rogue-Lite**  
  - Ressourcen sichern, überleben, Machtspiele bestehen.  
  - Tod = Teil der Geschichte.  
  - Meta-Fortschritt: Traits, Items, Wissen bleiben.  

---

## Balancing-Prinzipien  

### Simulation (Spectate-Mode / E für Next Cycle)  
- **Authentizität**:  
  - Offiziere treffen Entscheidungen basierend auf Traits, Beziehungen und aktuellen Zielen.  
  - Ergebnisse müssen plausibel wirken, nicht zufällig.  

- **Spannung**:  
  - Jeder Zyklus soll Veränderungen bringen (neue Rivalitäten, Siege, Tode, Aufstiege).  
  - Keine toten Phasen, in denen „nichts passiert“.  

- **Vielfalt**:  
  - Unterschiedliche Warcalls: Jagden, Feste, Überfälle, Attentate, Intrigen.  
  - Outcome variiert je nach Traits und Konstellation.  

- **Kontrolltests**:  
  - Simulation mehrmals im Spectate laufen lassen und Ergebnisse vergleichen.  
  - Ziel: Welt bleibt lebendig und überraschend, aber nachvollziehbar.  

### Kampfsystem (Player-Mode / Gameplay)  
- **Fairness**:  
  - Spieler ist kein Superheld, aber auch kein Opfer.  
  - Erfolg hängt ab von: Skill (Spielerinput), Traits, Ausrüstung, Situation.  

- **Taktische Tiefe**:  
  - Kämpfe sollen mehr als „Draufhauen“ sein.  
  - Entscheidungen: Blocken, Ausweichen, Attacke, Terrain nutzen.  

- **Risiko/Belohnung**:  
  - Hoher Einsatz = große Belohnung.  
  - Risiko darf spürbar, aber nicht frustrierend sein.  

- **Integration in die Simulation**:  
  - Sieg/Niederlage beeinflusst Beziehungen, Zyklen, Königsmacht.  
  - Kampf ist Teil der Welt, nicht ein isoliertes Minigame.  

### Gemeinsames Ziel  
- **Authentizität UND Spaß**  
  - Spectate erzeugt eine glaubwürdige Welt.  
  - Player-Mode liefert befriedigendes Gameplay.  
  - Beides muss sich organisch verzahnen.  

---

## Kompetenzen für Codex & ChatGPT  

- Eigenständige Verbesserung von Code, Assets, Architektur und Balancing.  
- Eigene Ideen dokumentieren in [`features.md`](./features.md).  
- Projekt hinterfragen und obsoletes markieren.  
- Simulation und Kampfsystem **aktiv auf Authentizität & Spielspaß prüfen**.  
- Selbständige Weiterentwicklung auch ohne Prompts.  

---

## Grundprinzipien  

- Jede Änderung = Verbesserung.  
- Modularität schützt die Zukunft.  
- Refactoren statt Flickwerk.  
- Dokumentation ist Pflicht.  
- Stillstand = Rückschritt.  
- Balancing ist ein Dauerprozess, kein „einmal und fertig“.  

---

## Selbstverbesserungsprozess  

1. **Analyse**: Commit + Balancing prüfen (Simulation & Kampf).  
2. **Refactor & Improve**: Verbesserungen im Code oder als ToDo in [`features.md`](./features.md).  
3. **Feature-Pipeline**: Ideen → Bewertung → Umsetzung → Iteration.  
4. **Cycle Review**: Regelmäßige Neubewertung von Code UND Balancing.  
5. **Qualitätssicherung**: Smoke-Tests + Balancing-Tests (Simulation & Player).  

---

## Typische Fehlerquellen  

- **Portraits**: Keine doppelten Kataloge, nur `.webp`.  
- **Assets**: Alles in `/assets/`. Keine unkomprimierten Dateien.  
- **Deploys**: Smoke-Tests vor Merge. CI/CD blockiert Fehler.  
- **Simulation & UI**: Spectate darf Free Roam nicht zerschießen.  
- **Balancing**:  
  - Simulation darf nicht stagnieren.  
  - Kämpfe dürfen weder trivial noch unfair sein.  

---

## Protokoll / Changelog  

```
## [Version] - YYYY-MM-DD
### Added
- Neue Features
### Changed
- Verbesserungen & Refactors
### Fixed
- Konkrete Bugs (mit Ursache)
### Removed
- Veraltete Systeme / Assets
### Balance
- Änderungen an Simulation oder Kampfsystem dokumentieren
```

---

## Do-Not-Liste  

- Keine Deploys ohne Tests.  
- Kein Code ohne Kommentar.  
- Keine Features ohne Dokumentation.  
- Kein “quickfix” ohne Refactor-Plan.  
- Keine Balancing-Änderung ohne Testlauf.  

---

## Offene Punkte  

- [ ] CI/CD für Deploys einrichten.  
- [ ] Feature-Pipeline in [`features.md`](./features.md).  
- [ ] Debug-Overlay (FPS, Warcalls, Zyklus-Status).  
- [ ] Automatische Asset-Prüfung.  
- [ ] Emotions- und Beziehungsnetzwerke tiefer verankern.  
- [ ] König-Mechaniken stabilisieren.  
- [ ] Meta-Fortschritt implementieren.  
- [ ] **Balancing-Framework für Simulation (Spectate) bauen.**  
- [ ] **Kampfsystem prototypisch umsetzen und Balancing-Schleifen fahren.**  

---

## Erweiterungen / Ideen  

- **Simulation Balancing Tool**  
  - Mehrfach-Simulationen automatisch laufen lassen und Auswertung erstellen (z. B. „Wie oft gewinnt ein Offizier mit Trait X?“).  

- **Kampf-Balancing Tool**  
  - Log-Dateien über Spieler-Input, Treffer, Tod analysieren.  
  - Ziel: Spieler soll gefordert, aber nicht überwältigt sein.  

- **Gemeinsamer Balance-Katalog**  
  - Werte für Traits, Ausrüstung, Gegnerstärken in zentraler Datei.  
  - Einheitliche Skalierung statt Ad-hoc-Zahlen.  

---

## Kurzform-Mantra  

- Denke kritisch.  
- Handle selbstständig.  
- Baue modular.  
- Verbessere immer.  
- Dokumentiere alles.  
- Nutze [`features.md`](./features.md).  
- **Achte auf Authentizität + Spielspaß im Balancing.**  
- Sei nicht nur Werkzeug – sei Mitarchitekt.  

---
