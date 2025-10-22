# Zusätzliche Empirische Analysen - Fragen 8-12

**Datum:** 2025-10-22  
**Analyse:** Erweiterte empirische Validierung  
**Datengrundlage:** 10 Simulationen × 200 Cycles = 2,000 Cycles

---

## Frage 8: Wie oft sterben GRUNZER, SPÄHER, CAPTAIN, KING nach mehreren Cycles?

### Antwort: Todesraten nach Rang ⚠️

**Empirische Daten:**
```
Grunzer:  305/430 gestorben (70.9%) ⚠️
Späher:   103/142 gestorben (72.5%) ⚠️
Captain:  85/121 gestorben (70.2%)
König:    10/10 gestorben (100.0%) ✅
```

**Wie hoch ist der Potentialeinfluss auf das Sterben in Warcalls?**

**Warcall-Todesraten nach POTENTIAL:**
```
Alle POTENTIAL-Ratings: 100% der Tode erfolgen in Warcalls
  - Dumm: 69 Tode (100% in Warcall, 20 in High-Risk)
  - Normal: 226 Tode (100% in Warcall, 92 in High-Risk)
  - Fähig: 129 Tode (100% in Warcall, 57 in High-Risk)
  - Überdurchschnittlich: 51 Tode (100% in Warcall, 21 in High-Risk)
  - Genie: 7 Tode (100% in Warcall, 2 in High-Risk)
  - Unbrauchbar: 21 Tode (100% in Warcall, 9 in High-Risk)
```

**Interpretation:**

✅ **Positive Befunde:**
- König-Todesrate 100% ist korrekt (alle werden gestürzt oder sterben in Thronschlachten)
- Alle Tode sind kampfbezogen (Warcalls oder Thronschlachten) - keine "natürlichen" Tode
- Das ist authentisch für eine kriegerische Ork-Gesellschaft

⚠️ **Problematische Befunde:**
- **Grunzer sterben zu häufig (70.9%)** - erschwert Karriere-Progression erheblich
- Späher und Captain haben ähnlich hohe Todesraten wie Grunzer (sollten besser überleben)
- Höhere Ränge sollten bessere Überlebenschancen haben durch Erfahrung/Stats

**POTENTIAL-Einfluss auf Überleben:**
- ⚠️ Kein erkennbarer Unterschied zwischen POTENTIAL-Ratings bei Todesraten
- Alle sterben zu ~100% in Warcalls unabhängig von POTENTIAL
- **Problem:** POTENTIAL sollte Überlebenschancen beeinflussen (höhere Stats = besser im Kampf)

**Empfehlungen:**
1. Reduziere Grunzer-Todesrate auf 50-60% für bessere Progression
2. Höhere Ränge sollten deutlich bessere Überlebensraten haben (Captain ~40%)
3. POTENTIAL sollte Warcall-Erfolg stärker beeinflussen (Genie > Normal > Dumm)

---

## Frage 9: Wie intelligent verhalten sich die Offiziere beim Allianzen schmieden?

### Antwort: Nur 28.8% der Allianzen sind vorteilhaft für beide ⚠️

**Empirische Daten:**
```
Gesamte Allianz-Paare: 569
Gegenseitig vorteilhaft (ähnliche Merit): 164 (28.8%) ⚠️
Beide Rivalen des Königs: 0 (0.0%)
```

**Definition "Gegenseitig vorteilhaft":**
- Merit-Unterschied < 50% des Durchschnitts beider Offiziere
- Beispiel: Officer A (100 Merit) + Officer B (120 Merit) = vorteilhaft ✅
- Beispiel: Officer A (50 Merit) + Officer B (200 Merit) = nicht vorteilhaft ❌

**Interpretation:**

⚠️ **Kritische Befunde:**
- **Nur 28.8% der Allianzen sind strategisch sinnvoll**
- Offiziere scheinen Allianzen zufällig einzugehen statt strategisch
- Kein einziges Allianz-Paar besteht aus zwei König-Rivalen
- Viele "ungleiche" Allianzen (schwacher + starker Offizier)

**Was fehlt:**
- Strategische Überlegungen bei Allianz-Bildung
- Merit-Ähnlichkeit als Faktor (gleichstarke Partner)
- Anti-König-Koalitionen (Rivalen sollten sich zusammenschließen)
- Langfristige Vorteile für beide Partner

**Empfehlungen:**

1. **Merit-Similarity-Faktor hinzufügen:**
   ```typescript
   // Bei Allianz-Bildung: Bevorzuge ähnlich starke Offiziere
   const meritDiff = Math.abs(officer1.merit - officer2.merit);
   const avgMerit = (officer1.merit + officer2.merit) / 2;
   const similarityBonus = 1 - (meritDiff / avgMerit); // 0-1
   allianceChance *= (0.5 + similarityBonus * 0.5);
   ```

2. **König-Rivalen bevorzugen einander als Allierte:**
   ```typescript
   if (bothAreRivalsOfKing) {
     allianceChance *= 2.0; // Doppelte Chance
   }
   ```

3. **Trait-basierte Allianz-Intelligenz:**
   - "Freundlich" + "Freundlich" = höhere Chance
   - "Unfreundlich" sollte Allianzen erschweren
   - "Nobel" zieht andere an

---

## Frage 10: Wie intelligent verhalten sich die Offiziere gegenüber ihren Rivalen?

### Antwort: Sehr intelligent - nur 1.5% Kooperation ✅

**Empirische Daten:**
```
Gesamte Rivalen-Paare verfolgt: 6,792
Rivalen im selben Warcall: 99 (1.5%) ✅
High-Stakes-Rivalitäten (beide >100 Merit): 2,892 (42.6%)
```

**Interpretation:**

✅ **Exzellente Befunde:**
- **Rivalen kooperieren fast nie (1.5%)**
- System verhindert korrekt, dass Feinde zusammenarbeiten
- 42.6% der Rivalitäten sind "High-Stakes" (beide etablierte Offiziere)
- Rivalitäten entstehen sowohl früh als auch zwischen erfahrenen Offizieren

**Was funktioniert gut:**
- Warcall-Teilnahme berücksichtigt offensichtlich Beziehungen
- Rivalen werden nicht in dieselben Missionen eingeteilt
- Authentisches Verhalten: Feinde meiden einander im Kampf

**Rare Kooperation (1.5%) ist realistisch:**
- Gelegentliche Zwangskooperation bei kritischen Missionen möglich
- König könnte Rivalen zusammenzwingen für wichtige Aufgaben
- Macht Ausnahmen bedeutungsvoll wenn sie vorkommen

**Keine Änderungen nötig** - dieses Verhalten ist optimal balanciert!

---

## Frage 11: Wie intelligent verhalten sich die Offiziere bezüglich ihrer nächsten Mission?

### Antwort: Gute Mission-Varietät, aber Ambition hat keinen sichtbaren Einfluss ⚠️

**Empirische Daten:**
```
Gesamte Warcalls: 2,643
High-Risk/High-Difficulty: 350 (13.2%) ✅
Low-Risk/Low-Difficulty: 278 (10.5%) ✅
Komplexe Missionen: 852 (32.2%) ✅
```

**Interpretation:**

✅ **Positive Befunde:**
- **Gute Balance zwischen verschiedenen Risiko-Stufen**
- 13.2% hochriskante Missionen (genug für Drama, nicht zu viel)
- 32.2% komplexe Missionen (Infiltration/Eroberung/Sabotage) bieten Varietät
- Nicht alle Missionen sind identisch - gute Vielfalt

⚠️ **Problematische Befunde:**
- **Ambition der Offiziere hat keinen messbaren Einfluss auf Mission-Auswahl**
- Keine erkennbare Korrelation zwischen Officer-Traits und Mission-Types
- Offiziere mit hoher Merit nehmen nicht bevorzugt schwierige Missionen an
- Initiierte Warcalls scheinen zufällig verteilt, nicht ambitionsbasiert

**Was fehlt:**

1. **Ambition → Mission-Typ Mapping:**
   ```typescript
   // Ambitionierte Offiziere sollten:
   if (officer.traits.includes('Unfreundlich') || officer.merit > 500) {
     // Bevorzuge High-Risk/High-Reward Missionen
     preferComplexMissions = true;
   }
   ```

2. **Rang-basierte Mission-Selektion:**
   - Grunzer: Einfache Missionen (Hunt, Feast)
   - Späher: Mittlere Missionen (Ambush, Duel)
   - Captain: Komplexe Missionen (Infiltration, Eroberung)

3. **Trait-basierte Präferenzen:**
   - "Archer" → bevorzugt Infiltration
   - "Berserker" → bevorzugt direkte Kämpfe (Duel, Ambush)
   - "Geheimnisvoll" → bevorzugt Sabotage

**Empfehlungen:**
- Implementiere Ambition-Faktor bei Warcall-Initiierung
- Höhere Ränge/Merit sollten schwerere Missionen bevorzugen
- Traits sollten Mission-Präferenzen beeinflussen

---

## Frage 12: Wie risikobereit sind die Offiziere bei Warcalls mit hohen Risiko?

### Antwort: Zu risikobereit - High-Risk-Missionen sind nicht gefährlich genug ⚠️

**Empirische Daten:**
```
High-Risk Warcalls (Risk > 0.7): 905
Durchschnittliche Teilnehmer: 2.69 ✅
Verlustrate in High-Risk: 6.5% ⚠️
Erfolgsrate in High-Risk: 64.2% ✅
```

**Interpretation:**

✅ **Positive Befunde:**
- **Kleine spezialisierte Teams (2.69) für riskante Missionen** - realistisch
- 64.2% Erfolgsrate ist ausgewogen (nicht zu einfach, nicht zu schwer)
- Offiziere nehmen nicht blindlings alle riskanten Missionen an

⚠️ **Kritische Befunde:**
- **6.5% Verlustrate ist viel zu niedrig für "High-Risk"**
- Bei Risk > 0.7 sollten Verluste bei 20-30% liegen
- "High-Risk" bedeutet derzeit praktisch nichts
- Offiziere sollten vorsichtiger bei gefährlichen Missionen sein

**Problem:**
- Risk-Rating spiegelt nicht die tatsächliche Gefahr wider
- Offiziere haben keinen Grund, High-Risk-Missionen zu vermeiden
- Keine erkennbaren Konsequenzen für riskantes Verhalten

**Empfehlungen:**

1. **Erhöhe Verlustrate in High-Risk Warcalls:**
   ```typescript
   if (warcall.risk > 0.7 && !success) {
     // Deutlich höhere Chance auf Verluste
     casualtyChance = 0.4 + (warcall.risk * 0.3); // 40-60% bei Risk 0.7-1.0
   }
   ```

2. **Implementiere Risk-Awareness:**
   ```typescript
   // Offiziere mit niedrigem POTENTIAL oder Merit sollten High-Risk meiden
   if (warcall.risk > 0.7) {
     if (officer.stats.potential === 'Dumm' || officer.merit < 200) {
       participationChance *= 0.3; // 70% weniger wahrscheinlich
     }
   }
   ```

3. **Trait-basierte Risikobereitschaft:**
   - "Robust" → akzeptiert höheres Risiko
   - "Weich" → meidet High-Risk
   - "Schlau" → berechnet Risk/Reward besser

4. **Dynamische Risk-Anpassung:**
   ```typescript
   // Risk sollte sich an Teilnehmer-Stärke anpassen
   const teamStrength = participants.reduce((sum, o) => sum + o.stats.level, 0);
   adjustedRisk = baseRisk * (1 - teamStrength / 100);
   ```

---

## Zusammenfassung der Befunde Q8-Q12

### ✅ Was funktioniert gut:

1. **Rivalen-Verhalten (Q10):** Nur 1.5% Kooperation - perfekt
2. **Mission-Varietät (Q11):** 13.2% high-risk, 32.2% komplex - ausgewogen
3. **Team-Größen (Q12):** 2.69 Teilnehmer bei High-Risk - realistisch
4. **Kampf-Tode (Q8):** 100% der Tode sind kampfbezogen - authentisch

### ⚠️ Was verbessert werden muss:

1. **Grunzer-Todesrate (Q8):** 70.9% ist zu hoch → Ziel: 50-60%
2. **Allianz-Intelligenz (Q9):** Nur 28.8% vorteilhaft → Ziel: 50-60%
3. **POTENTIAL-Einfluss auf Überleben (Q8):** Nicht messbar → muss stärker werden
4. **High-Risk Konsequenzen (Q12):** 6.5% Verluste → Ziel: 20-30%
5. **Ambition-Einfluss (Q11):** Nicht sichtbar → implementieren

### 📊 Balancing-Prioritäten:

**Hoch:**
- Reduziere Grunzer-Todesrate (Q8)
- Erhöhe High-Risk-Verluste (Q12)
- Implementiere strategische Allianz-Bildung (Q9)

**Mittel:**
- Stärke POTENTIAL-Einfluss auf Warcall-Erfolg (Q8)
- Füge Ambition-basierte Mission-Selektion hinzu (Q11)

**Niedrig:**
- Trait-basierte Risikobereitschaft (Q12)
- Anti-König-Koalitionen fördern (Q9)

---

## Technische Implementierungsvorschläge

### 1. Reduziere Grunzer-Todesrate (Q8)

**In `src/sim/warcall.ts`:**
```typescript
function determineCasualties(
  rng: RNG,
  participants: Officer[],
  success: boolean
): OrcId[] {
  if (success) return [];
  
  // Rank-based survival bonus
  const survivalBonusByRank = {
    'König': 0.5,   // 50% weniger Tode
    'Captain': 0.3, // 30% weniger Tode
    'Späher': 0.15, // 15% weniger Tode
    'Grunzer': 0.0  // Keine Boni
  };
  
  const casualties: OrcId[] = [];
  participants.forEach(officer => {
    const baseChance = 0.4; // 40% Basis-Todesrate bei Misserfolg
    const rankBonus = survivalBonusByRank[officer.rank] || 0;
    const deathChance = baseChance * (1 - rankBonus);
    
    if (rng.chance(deathChance)) {
      casualties.push(officer.id);
    }
  });
  
  return casualties;
}
```

### 2. Strategische Allianz-Bildung (Q9)

**In `src/sim/relationships.ts`:**
```typescript
export function seedSpawnRelationships(
  state: WorldState,
  officer: Officer,
  rng: RNG
): FeedEntry[] {
  const feed: FeedEntry[] = [];
  const others = state.officers.filter(o => o.id !== officer.id);
  if (others.length === 0) return feed;

  // Priorisiere ähnlich starke Partner
  const sortedByMerit = [...others].sort((a, b) => {
    const diffA = Math.abs(a.merit - officer.merit);
    const diffB = Math.abs(b.merit - officer.merit);
    return diffA - diffB;
  });
  
  // Wähle Partner aus den Merit-ähnlichsten
  const compatiblePartners = sortedByMerit.slice(0, Math.floor(others.length / 3));
  const partner = rng.pick(compatiblePartners);
  
  // Check für König-Rivalität
  const king = state.officers.find(o => o.rank === 'König');
  const bothRivalsOfKing = king && 
    officer.relationships.some(r => r.type === 'RIVAL' && r.with === king.id) &&
    partner.relationships.some(r => r.type === 'RIVAL' && r.with === king.id);
  
  let allianceChance = 0.25; // Base 25%
  if (bothRivalsOfKing) allianceChance = 0.6; // 60% wenn beide König-Rivalen
  
  if (rng.chance(allianceChance)) {
    const entry = formRelationship(state, officer.id, partner.id, 'ALLY', state.cycle, rng);
    if (entry) feed.push(entry);
  }
  
  return feed;
}
```

### 3. High-Risk Konsequenzen (Q12)

**In `src/sim/warcall.ts`:**
```typescript
function determineCasualties(
  rng: RNG,
  participants: Officer[],
  success: boolean,
  warcall: WarcallPlan
): OrcId[] {
  if (success) return [];
  
  const casualties: OrcId[] = [];
  const riskMultiplier = 1 + warcall.risk; // 1.0-2.0
  
  participants.forEach(officer => {
    // Basis: 30% bei normalen Missionen
    let deathChance = 0.3 * riskMultiplier;
    
    // POTENTIAL-Einfluss
    const potentialSurvivalBonus = {
      'Genie': 0.4,
      'Überdurchschnittlich': 0.25,
      'Fähig': 0.15,
      'Normal': 0.0,
      'Dumm': -0.1,
      'Unbrauchbar': -0.2
    };
    
    deathChance *= (1 - (potentialSurvivalBonus[officer.stats.potential] || 0));
    
    if (rng.chance(Math.min(0.8, deathChance))) {
      casualties.push(officer.id);
    }
  });
  
  return casualties;
}
```

---

## Fazit

Die erweiterte Analyse Q8-Q12 zeigt:

✅ **Funktioniert gut:**
- Rivalen-Dynamiken sind authentisch
- Mission-Varietät bietet Abwechslung
- Kampf ist Haupttodesursache (realistisch)

⚠️ **Muss verbessert werden:**
- Grunzer sterben zu oft (70.9% → Ziel 50-60%)
- Allianzen zu zufällig (28.8% → Ziel 50-60% strategisch)
- High-Risk nicht riskant genug (6.5% → Ziel 20-30% Verluste)

📋 **Empfehlung:**
Implementiere die vorgeschlagenen Balancing-Patches in Prioritätsreihenfolge, dann wiederhole die Analyse zur Validierung.

---

**Analysiert:** GitHub Copilot  
**Datum:** 2025-10-22  
**Methode:** Empirisch deterministische Simulation (10 × 200 Cycles)
