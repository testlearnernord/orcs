# features.md

## Zweck

Diese Datei dient als **Feature-Pipeline**.  
Alle neuen Ideen, Vorschläge, abgelehnten Features und ToDos werden hier gesammelt, damit das Projekt nicht vergisst, was noch möglich ist.  
Die `agents.md` verweist ausdrücklich auf diese Datei.

---

## Struktur für Einträge

```
### [Datum] - [Titel / Kurze Beschreibung]

**Status:** Idee | In Prüfung | Geplant | Umgesetzt | Abgelehnt
**Kategorie:** Gameplay | Simulation | UI | Assets | Meta | Balancing | Sonstiges

**Beschreibung:**
Kurzer Absatz, der erklärt, was das Feature leisten soll und warum es relevant ist.

**Risiken / Abhängigkeiten:**
- [ ] z. B. Performance, Architektur, Assets nötig

**Nächste Schritte:**
- [ ] Evaluieren
- [ ] Prototyp bauen
- [ ] In Master mergen
```

---

## Beispiel-Einträge

### 2025-09-27 – Emotionssystem erweitern

**Status:** In Prüfung  
**Kategorie:** Simulation

**Beschreibung:**  
Offiziere sollen Emotionen wie Rache, Trauer und Stolz ausleben, die direkt ihr Verhalten prägen.

**Risiken / Abhängigkeiten:**

- [ ] Neue Speicherstruktur für Beziehungen
- [ ] UI-Anzeigen für Emotionen

**Nächste Schritte:**

- [ ] Prototyp entwickeln
- [ ] Simulationstests laufen lassen

---

### 2025-09-27 – Kampfsystem-Balancing Framework

**Status:** Idee  
**Kategorie:** Balancing

**Beschreibung:**  
Ein Test-Framework, das Spieler-Kämpfe loggt (Input, Treffer, Schaden, Todesfälle) und statistisch auswertet. Ziel: faire und spaßige Kämpfe.

**Risiken / Abhängigkeiten:**

- [ ] Logging muss Performance-schonend laufen
- [ ] Datenstruktur für Auswertung nötig

**Nächste Schritte:**

- [ ] Logging implementieren
- [ ] Analyse-Skript schreiben
- [ ] Erste Testläufe fahren
