# Officer Level-Up System Implementation

## Problem Statement
Officers in the simulation were not leveling up or becoming stronger. While the EXP bar was displayed in the UI, it was purely cosmetic - officers never actually gained experience or increased their levels and stats during gameplay.

## Root Cause Analysis
The simulation had:
- Merit system for rank promotions ✓
- EXP bar display in UI ✓
- NO actual experience gain mechanism ✗
- NO level-up processing ✗
- NO stat increases during gameplay ✗

Officers were created with fixed levels (1-14 based on rank) that never changed.

## Solution Implemented

### 1. Experience Calculation (`src/sim/experience.ts`)
Created a comprehensive experience system that:
- Converts merit to experience (80% conversion rate)
- Applies trait modifiers:
  - **Schlau**: +25% experience gain
  - **Dumm**: -25% experience gain  
  - **Weise**: +10% experience gain AND +1 stat point on level-up
- Calculates total EXP as: `baseExpForLevel + meritBonus + levelBonus`

**Formula**: Experience needed for next level = `(level + 1)² × 100`
- Level 1→2: 400 EXP
- Level 2→3: 900 EXP
- Level 5→6: 3,600 EXP
- Level 10→11: 12,100 EXP

### 2. Level-Up Mechanics
Officers level up when current EXP ≥ next level requirement.

**Stat Gains Per Level** (based on potential):
| Potential | Base Stats | +Weise |
|-----------|-----------|--------|
| Genie | 7 points | 8 points |
| Überdurchschnittlich | 5 points | 6 points |
| Fähig | 4 points | 5 points |
| Normal | 3 points | 4 points |
| Dumm | 2 points | 3 points |
| Unbrauchbar | 1 point | 2 points |

**Stat Distribution** (archetype-based):
- **Berserker**: 60% STR, 20% DEX, 20% INT
- **Archer**: 60% DEX, 20% STR, 20% INT
- **Trapper**: 60% INT, 20% DEX, 20% STR
- **All**: +10 max HP per level

### 3. Rivalry Challenge System
Added a new mechanic for officers to gain additional merit and progression:

**Challenge Triggers**:
- Officers with ambitious goals: "Möchte stärker werden", "Möchte König werden", etc.
- 15% base chance per cycle (30% for Unfreundlich trait)
- Only if they have rivals
- Maximum one challenge per officer per cycle

**Challenge Resolution**:
- Success based on relative power (level × 10 + STR + DEX + INT)
- Winner: +15 merit
- Loser: +5 merit (for trying)
- Both participants gain experience through merit

**Merit → Experience → Level-Up → Stronger → Better challenges**

### 4. Integration in Simulation Cycle
Modified `src/sim/cycle.ts` to process:
1. Warcalls (generate merit)
2. **Rivalry Challenges** (additional merit opportunities) ← NEW
3. **Level-Ups** (convert merit to EXP, level up if threshold reached) ← NEW
4. Promotions (rank changes based on merit)

### 5. UI Updates
Updated `src/ui/components/officerCard.ts` to:
- Use shared `getCurrentExp()` and `getExpForLevel()` functions
- Display actual simulation-calculated experience
- Show accurate progress towards next level
- Highlight level-ups when they occur

## Test Coverage

### Unit Tests (`tests/sim/experience.spec.ts`)
- ✓ Experience threshold calculations
- ✓ Merit to experience conversion
- ✓ Trait modifier effects
- ✓ Level-up stat gains
- ✓ Potential-based stat increases
- ✓ Weise trait bonus points
- ✓ Batch level-up processing

### Integration Tests (`tests/sim/levelup-integration.spec.ts`)
- ✓ Officers level up over 50 cycles (18 level-ups detected)
- ✓ Rivalry challenges occur (9 challenges in 50 cycles)
- ✓ Higher potential officers gain more stats
- ✓ Trait effects on experience gain work correctly

### Regression Tests
- ✓ All 125 existing tests still pass
- ✓ Balance test maintains proper rank distribution
- ✓ Warcall success rates unchanged
- ✓ Promotion system unaffected

## Results

**In a 50-cycle simulation**:
- 18 level-up events occurred
- 9 rivalry challenges happened
- Officers with high merit actively become stronger
- Potential rating matters for long-term growth
- Traits have measurable impact on progression

**Example Progression**:
A Grunzer (Level 1) with Normal potential and 500 merit:
- Current EXP: ~550 (from merit and level bonus)
- Needs: 400 EXP for Level 2
- **Levels up to 2** ← This now happens!
- Gains: +3 random stats (archetype-weighted) + 10 HP

## Files Changed

**New Files**:
- `src/sim/experience.ts` - Core level-up system (217 lines)
- `tests/sim/experience.spec.ts` - Unit tests (204 lines)
- `tests/sim/levelup-integration.spec.ts` - Integration tests (156 lines)

**Modified Files**:
- `src/sim/cycle.ts` - Added level-up and rivalry processing
- `src/ui/components/officerCard.ts` - Use shared EXP calculation

**Total**: ~600 lines of new, tested, documented code

## Future Enhancements (Optional)

- Add experience multipliers for different warcall types
- Implement experience loss on death (for permadeath feel)
- Add "veteran" status for high-level officers
- Create level-based unlocks (special abilities at certain levels)
- Track lifetime level-ups in officer memories

## Compliance with Requirements

✅ EXP-Generierung für Offiziere verbessern  
✅ Level-Up-Mechanik funktional implementieren  
✅ Offiziere aktiv Rivalen herausfordern lassen  
✅ Potential des Offiziers berücksichtigen  

The simulation is now more authentic - officers grow stronger through their actions!
