# copilot-instructions.md  

## Zweck  
Diese Datei gibt **GitHub Copilot** klare Richtlinien für die Arbeit in diesem Projekt.  
Sie ergänzt die [`agents.md`](./agents.md) und [`features.md`](./features.md) und sorgt dafür, dass Copilot nicht nur Code vorschlägt, sondern auch im Sinne der Projektvision handelt.  

---

## Grundregeln für Copilot  

1. **Projektkontext beachten**  
   - Copilot soll Vorschläge machen, die zur Vision aus `agents.md` passen.  
   - Features und Balancing-Ideen müssen mit [`features.md`](./features.md) abgeglichen werden.  

2. **Modularität vorziehen**  
   - Vorschläge immer modular und erweiterbar.  
   - Keine Hardcodings oder Quickfixes, wenn ein sauberes Modul möglich ist.  

3. **Balancing berücksichtigen**  
   - Im Spectate-Mode: Authentische, nachvollziehbare Simulation.  
   - Im Player-Mode: Kampfsystem fair, taktisch und spaßig.  

4. **Dokumentation erzwingen**  
   - Jeder neue Code-Vorschlag soll Kommentare oder kurze Erklärungen enthalten.  
   - Änderungen müssen mit Changelog-Einträgen kompatibel sein.  

5. **Refactor statt Flickwerk**  
   - Copilot darf alten Code hinterfragen und Refactoring vorschlagen.  
   - Redundanz oder toter Code soll entfernt werden.  

---

## Stilrichtlinien  

- **Klarheit über Kürze**: Lieber etwas mehr Code, der verständlich ist.  
- **Namenskonventionen**:  
  - Variablen und Funktionen sprechend benennen.  
  - Englisch als Standardsprache.  
- **Ordnerstruktur respektieren**:  
  - Assets nur in `/assets/`.  
  - Builds in `/docs/` oder `/dist/` – niemals beides.  

---

## Copilot darf …  

- Eigenständig Verbesserungsvorschläge machen.  
- Features vorschlagen und in [`features.md`](./features.md) eintragen (oder Einträge vorbereiten).  
- Architektur hinterfragen und bessere Lösungen anbieten.  
- Test- und Debug-Tools vorschlagen.  

## Copilot darf NICHT …  

- Binärdateien generieren oder ins Repo mischen.  
- Schnellschüsse ohne Dokumentation einfügen.  
- Projektstruktur ändern, ohne es klar zu begründen.  
- Kommentare oder Doku weglassen.  

---

## Beispiele für erwünschtes Verhalten  

- **Erweiterung**: Copilot schlägt eine Utility-Funktion für Warcall-Logik vor, dokumentiert sie und macht sie wiederverwendbar.  
- **Refactor**: Copilot erkennt doppelte Portrait-Ladefunktionen und schlägt eine zentrale Lösung vor.  
- **Balancing**: Copilot ergänzt Testwerte im Kampfsystem, um Trefferchance und Schaden besser auszubalancieren.  

---

## Kurzmantra für Copilot  

- Baue modular.  
- Denke kritisch.  
- Achte auf Balancing.  
- Dokumentiere alles.  
- Halte dich an [`agents.md`](./agents.md) & [`features.md`](./features.md).  
