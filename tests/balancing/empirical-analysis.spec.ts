/**
 * Empirical Balancing Analysis for ORCS SPECTATE Mode
 * 
 * This test suite runs comprehensive simulation analysis to answer:
 * 1. How long does a King survive on average?
 * 2. What are the chances of Grunzer → König career progression?
 * 3. How often do alliances form against the König?
 * 4. How often do clashes (throne battles, warcalls) occur?
 * 5. Does POTENTIAL stat influence career paths?
 * 6. Do RPG parameters make sense?
 * 7. Does the simulation create memorable stories?
 * 8. How often do officers of each rank die? What is POTENTIAL's influence?
 * 9. How intelligently do officers form alliances (mutual benefit)?
 * 10. How intelligently do officers behave towards their rivals?
 * 11. How intelligently do officers choose missions based on ambition?
 * 12. How risk-aware are officers when facing high-risk warcalls?
 */

import { describe, it, expect } from 'vitest';
import { RNG } from '@sim/rng';
import { createWorld } from '@sim/world';
import { advanceCycle } from '@sim/cycle';
import type { WorldState, Officer } from '@sim/types';

const SIMULATION_CYCLES = 200;
const SIMULATION_RUNS = 10;

interface RunData {
  id: number;
  seed: number;
  kings: Array<{
    id: string;
    name: string;
    startCycle: number;
    endCycle: number | null;
    endReason: string | null;
  }>;
  officers: Map<string, {
    id: string;
    name: string;
    spawned: number;
    initialRank: string;
    initialPotential: string;
    initialLevel: number;
    initialTraits: string[];
    ranks: Array<{ rank: string; cycle: number; merit: number }>;
    died: number | null;
    finalLevel: number | null;
    deathContext?: {
      rank: string;
      potential: string;
      inWarcall: boolean;
      warcallRisk?: number;
      warcallSuccess?: boolean;
    };
  }>;
  throneBattles: Array<{
    cycle: number;
    success: boolean;
    casualties: string[];
  }>;
  warcalls: Array<{
    cycle: number;
    kind: string;
    success: boolean;
    participants: number;
    casualties: number;
    risk: number;
    baseDifficulty: number;
    participantIds: string[];
  }>;
  alliances: Array<{
    cycle: number;
    kingId: string;
    rivalCount: number;
    allyPairs: Array<{
      officer1: string;
      officer2: string;
      officer1Merit: number;
      officer2Merit: number;
      bothRivalsOfKing: boolean;
    }>;
  }>;
  rivalBehaviors: Array<{
    cycle: number;
    officer1: string;
    officer2: string;
    officer1Merit: number;
    officer2Merit: number;
    bothInSameWarcall: boolean;
  }>;
  cycles: Array<{
    cycle: number;
    deaths: number;
    spawns: number;
    promotions: number;
    warcalls: number;
  }>;
}

function runSimulation(runId: number, seed: number): RunData {
  const rng = new RNG(seed);
  const world: WorldState = createWorld(`sim-${seed}`, rng);
  
  const runData: RunData = {
    id: runId,
    seed,
    kings: [],
    officers: new Map(),
    throneBattles: [],
    warcalls: [],
    alliances: [],
    rivalBehaviors: [],
    cycles: []
  };

  // Track initial king
  const initialKing = world.officers.find(o => o.id === world.kingId);
  if (initialKing) {
    runData.kings.push({
      id: initialKing.id,
      name: initialKing.name,
      startCycle: 0,
      endCycle: null,
      endReason: null
    });
  }

  // Initialize officer tracking
  world.officers.forEach(officer => {
    runData.officers.set(officer.id, {
      id: officer.id,
      name: officer.name,
      spawned: officer.cycleJoined,
      initialRank: officer.rank,
      initialPotential: officer.stats.potential,
      initialLevel: officer.stats.level,
      initialTraits: [...officer.traits],
      ranks: [{ rank: officer.rank, cycle: 0, merit: officer.merit }],
      died: null,
      finalLevel: null
    });
  });

  // Run simulation
  for (let cycle = 1; cycle <= SIMULATION_CYCLES; cycle++) {
    const summary = advanceCycle(world, rng);
    
    runData.cycles.push({
      cycle,
      deaths: summary.deaths.length,
      spawns: summary.spawns.length,
      promotions: summary.promotions.length,
      warcalls: summary.warcallsResolved.length
    });

    // Check for king changes
    const currentKingId = world.kingId;
    const lastKing = runData.kings[runData.kings.length - 1];
    if (lastKing && lastKing.id !== currentKingId) {
      lastKing.endCycle = cycle;
      lastKing.endReason = summary.deaths.includes(lastKing.id) ? 'DEATH' : 'OVERTHROWN';
      
      const newKing = world.officers.find(o => o.id === currentKingId);
      if (newKing) {
        runData.kings.push({
          id: newKing.id,
          name: newKing.name,
          startCycle: cycle,
          endCycle: null,
          endReason: null
        });
      }
    }

    // Track deaths
    summary.deaths.forEach(deadId => {
      if (runData.officers.has(deadId)) {
        const officerData = runData.officers.get(deadId)!;
        officerData.died = cycle;
        
        const deadOfficer = world.graveyard.find(o => o.id === deadId);
        if (deadOfficer) {
          officerData.finalLevel = deadOfficer.stats.level;
          
          // Track death context for Q8
          const currentRank = officerData.ranks[officerData.ranks.length - 1]?.rank || officerData.initialRank;
          const diedInWarcall = summary.warcallsResolved.some(r => r.casualties.includes(deadId));
          
          let warcallInfo: { risk?: number; success?: boolean } = {};
          if (diedInWarcall) {
            const fatalWarcall = summary.warcallsResolved.find(r => r.casualties.includes(deadId));
            if (fatalWarcall) {
              warcallInfo = {
                risk: fatalWarcall.warcall.risk,
                success: fatalWarcall.success
              };
            }
          }
          
          officerData.deathContext = {
            rank: currentRank,
            potential: officerData.initialPotential,
            inWarcall: diedInWarcall,
            warcallRisk: warcallInfo.risk,
            warcallSuccess: warcallInfo.success
          };
        }
      }
    });

    // Track spawns
    summary.spawns.forEach(spawn => {
      runData.officers.set(spawn.id, {
        id: spawn.id,
        name: spawn.name,
        spawned: cycle,
        initialRank: spawn.rank,
        initialPotential: spawn.stats.potential,
        initialLevel: spawn.stats.level,
        initialTraits: [...spawn.traits],
        ranks: [{ rank: spawn.rank, cycle, merit: spawn.merit }],
        died: null,
        finalLevel: null
      });
    });

    // Track promotions
    summary.promotions.forEach(promo => {
      if (runData.officers.has(promo.officerId)) {
        const officer = world.officers.find(o => o.id === promo.officerId);
        if (officer) {
          runData.officers.get(promo.officerId)!.ranks.push({
            rank: promo.to,
            cycle,
            merit: officer.merit
          });
        }
      }
    });

    // Track warcalls
    summary.warcallsResolved.forEach(resolution => {
      if (resolution.warcall.kind === 'Thronschlacht') {
        runData.throneBattles.push({
          cycle,
          success: resolution.success,
          casualties: resolution.casualties
        });
      } else {
        runData.warcalls.push({
          cycle,
          kind: resolution.warcall.kind,
          success: resolution.success,
          participants: resolution.warcall.participants.length,
          casualties: resolution.casualties.length,
          risk: resolution.warcall.risk,
          baseDifficulty: resolution.warcall.baseDifficulty,
          participantIds: [...resolution.warcall.participants]
        });
      }
    });

    // Track alliances against king and alliance intelligence (Q9)
    const king = world.officers.find(o => o.id === currentKingId);
    if (king) {
      const rivalsOfKing = world.officers.filter(o => 
        o.relationships.some(rel => rel.type === 'RIVAL' && rel.with === king.id)
      );
      
      // Track ally pairs for Q9 intelligence analysis
      const allyPairs: Array<{
        officer1: string;
        officer2: string;
        officer1Merit: number;
        officer2Merit: number;
        bothRivalsOfKing: boolean;
      }> = [];
      
      world.officers.forEach(officer1 => {
        officer1.relationships.filter(rel => rel.type === 'ALLY').forEach(allyRel => {
          const officer2 = world.officers.find(o => o.id === allyRel.with);
          if (officer2 && officer1.id < officer2.id) { // Avoid duplicates
            const bothRivals = rivalsOfKing.some(r => r.id === officer1.id) && 
                              rivalsOfKing.some(r => r.id === officer2.id);
            allyPairs.push({
              officer1: officer1.id,
              officer2: officer2.id,
              officer1Merit: officer1.merit,
              officer2Merit: officer2.merit,
              bothRivalsOfKing: bothRivals
            });
          }
        });
      });
      
      if (rivalsOfKing.length >= 2) {
        runData.alliances.push({
          cycle,
          kingId: currentKingId,
          rivalCount: rivalsOfKing.length,
          allyPairs
        });
      }
    }
    
    // Track rival behaviors for Q10
    world.officers.forEach(officer1 => {
      officer1.relationships.filter(rel => rel.type === 'RIVAL').forEach(rivalRel => {
        const officer2 = world.officers.find(o => o.id === rivalRel.with);
        if (officer2 && officer1.id < officer2.id) { // Avoid duplicates
          // Check if both are in the same warcall
          const bothInSameWarcall = summary.warcallsResolved.some(r => 
            r.warcall.participants.includes(officer1.id) && 
            r.warcall.participants.includes(officer2.id)
          );
          
          runData.rivalBehaviors.push({
            cycle,
            officer1: officer1.id,
            officer2: officer2.id,
            officer1Merit: officer1.merit,
            officer2Merit: officer2.merit,
            bothInSameWarcall
          });
        }
      });
    });
  }

  // Finalize
  const finalKing = runData.kings[runData.kings.length - 1];
  if (finalKing && !finalKing.endCycle) {
    finalKing.endCycle = SIMULATION_CYCLES;
    finalKing.endReason = 'SIMULATION_END';
  }

  world.officers.forEach(officer => {
    if (runData.officers.has(officer.id)) {
      runData.officers.get(officer.id)!.finalLevel = officer.stats.level;
    }
  });

  return runData;
}

describe('Empirical Balancing Analysis', () => {
  let runs: RunData[] = [];

  it('should run multiple simulations', () => {
    console.log(`\n=== Running ${SIMULATION_RUNS} simulations with ${SIMULATION_CYCLES} cycles each ===\n`);
    
    for (let i = 0; i < SIMULATION_RUNS; i++) {
      const seed = Date.now() + i * 1000;
      console.log(`Running simulation ${i + 1}/${SIMULATION_RUNS}...`);
      const runData = runSimulation(i, seed);
      runs.push(runData);
    }
    
    expect(runs).toHaveLength(SIMULATION_RUNS);
    console.log(`\nCompleted ${SIMULATION_RUNS} simulations\n`);
  });

  it('Q1: should analyze king survival duration', () => {
    console.log('\n====================================');
    console.log('Q1: King Survival Analysis');
    console.log('====================================\n');

    const allKings = runs.flatMap(run => run.kings);
    const survivals = allKings
      .filter(k => k.endCycle !== null)
      .map(k => k.endCycle! - k.startCycle);

    if (survivals.length === 0) {
      console.log('⚠️  No king changes detected');
      expect(survivals.length).toBeGreaterThan(0);
      return;
    }

    const avgSurvival = survivals.reduce((sum, s) => sum + s, 0) / survivals.length;
    const medianSurvival = survivals.sort((a, b) => a - b)[Math.floor(survivals.length / 2)];

    console.log(`Total kings: ${allKings.length}`);
    console.log(`Kings replaced: ${survivals.length}`);
    console.log(`Average survival: ${avgSurvival.toFixed(1)} cycles`);
    console.log(`Median survival: ${medianSurvival} cycles`);

    const deathReasons: Record<string, number> = {};
    allKings.filter(k => k.endReason).forEach(k => {
      deathReasons[k.endReason!] = (deathReasons[k.endReason!] || 0) + 1;
    });

    console.log('\nKing end reasons:');
    Object.entries(deathReasons).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count}`);
    });

    console.log('\n💡 Balancing Insights:');
    if (avgSurvival < 20) {
      console.log('  ⚠️  Kings change too frequently (< 20 cycles)');
    } else if (avgSurvival > 80) {
      console.log('  ⚠️  Kings rule too long (> 80 cycles)');
    } else {
      console.log('  ✅ King survival duration is reasonable (20-80 cycles)');
    }

    // Reasonable king survival expectation
    expect(avgSurvival).toBeGreaterThan(10);
    expect(avgSurvival).toBeLessThan(150);
  });

  it('Q2: should analyze career progression (Grunzer → König)', () => {
    console.log('\n====================================');
    console.log('Q2: Career Progression Analysis');
    console.log('====================================\n');

    let grunzerCount = 0;
    let becameKingCount = 0;
    let reachedCaptainCount = 0;
    let reachedSpaeherCount = 0;

    runs.forEach(run => {
      run.officers.forEach(officer => {
        if (officer.initialRank === 'Grunzer') {
          grunzerCount++;
          const ranks = officer.ranks.map(r => r.rank);
          
          if (ranks.includes('König')) becameKingCount++;
          if (ranks.includes('Captain')) reachedCaptainCount++;
          if (ranks.includes('Späher')) reachedSpaeherCount++;
        }
      });
    });

    console.log(`Total Grunzer: ${grunzerCount}`);
    console.log(`Became König: ${becameKingCount} (${((becameKingCount / grunzerCount) * 100).toFixed(2)}%)`);
    console.log(`Reached Captain: ${reachedCaptainCount} (${((reachedCaptainCount / grunzerCount) * 100).toFixed(2)}%)`);
    console.log(`Reached Späher: ${reachedSpaeherCount} (${((reachedSpaeherCount / grunzerCount) * 100).toFixed(2)}%)`);

    // Analyze by potential
    const potentialBreakdown: Record<string, { total: number; captain: number; spaeher: number; koenig: number }> = {};
    runs.forEach(run => {
      run.officers.forEach(officer => {
        if (officer.initialRank === 'Grunzer') {
          const potential = officer.initialPotential;
          if (!potentialBreakdown[potential]) {
            potentialBreakdown[potential] = { total: 0, captain: 0, spaeher: 0, koenig: 0 };
          }
          potentialBreakdown[potential].total++;
          
          const ranks = officer.ranks.map(r => r.rank);
          if (ranks.includes('Captain')) potentialBreakdown[potential].captain++;
          if (ranks.includes('Späher')) potentialBreakdown[potential].spaeher++;
          if (ranks.includes('König')) potentialBreakdown[potential].koenig++;
        }
      });
    });

    console.log('\nPromotion rates by POTENTIAL:');
    Object.entries(potentialBreakdown).forEach(([potential, data]) => {
      console.log(`  ${potential} (${data.total}):`);
      console.log(`    → Späher: ${((data.spaeher / data.total) * 100).toFixed(1)}%`);
      console.log(`    → Captain: ${((data.captain / data.total) * 100).toFixed(1)}%`);
    });

    console.log('\n💡 Balancing Insights:');
    if ((reachedCaptainCount / grunzerCount) < 0.05) {
      console.log('  ⚠️  Very few Grunzer reach Captain (< 5%)');
    } else {
      console.log('  ✅ Career progression seems possible');
    }

    expect(grunzerCount).toBeGreaterThan(0);
    expect(reachedSpaeherCount).toBeGreaterThan(0);
  });

  it('Q3: should analyze alliance formation against König', () => {
    console.log('\n====================================');
    console.log('Q3: Alliance Formation Analysis');
    console.log('====================================\n');

    const totalAllianceEvents = runs.reduce((sum, run) => sum + run.alliances.length, 0);

    console.log(`Total alliance events: ${totalAllianceEvents}`);
    console.log(`Alliance events per 100 cycles: ${((totalAllianceEvents / (SIMULATION_RUNS * SIMULATION_CYCLES)) * 100).toFixed(1)}`);

    console.log('\n💡 Balancing Insights:');
    if (totalAllianceEvents === 0) {
      console.log('  ⚠️  No alliances detected against König');
    } else if (totalAllianceEvents > SIMULATION_RUNS * 20) {
      console.log('  ⚠️  Too many alliances (> 20 per simulation)');
    } else {
      console.log('  ✅ Alliance frequency seems reasonable');
    }
  });

  it('Q4: should analyze clash frequency', () => {
    console.log('\n====================================');
    console.log('Q4: Clash Frequency Analysis');
    console.log('====================================\n');

    let totalThroneBattles = 0;
    let successfulCoups = 0;
    let totalWarcalls = 0;
    let successfulWarcalls = 0;

    runs.forEach(run => {
      totalThroneBattles += run.throneBattles.length;
      successfulCoups += run.throneBattles.filter(b => b.success).length;
      totalWarcalls += run.warcalls.length;
      successfulWarcalls += run.warcalls.filter(w => w.success).length;
    });

    console.log(`Throne battles: ${totalThroneBattles}`);
    console.log(`Successful coups: ${successfulCoups} (${((successfulCoups / Math.max(totalThroneBattles, 1)) * 100).toFixed(1)}%)`);
    console.log(`Total warcalls: ${totalWarcalls}`);
    console.log(`Successful warcalls: ${successfulWarcalls} (${((successfulWarcalls / Math.max(totalWarcalls, 1)) * 100).toFixed(1)}%)`);
    console.log(`Warcalls per cycle: ${(totalWarcalls / (SIMULATION_RUNS * SIMULATION_CYCLES)).toFixed(2)}`);

    console.log('\n💡 Balancing Insights:');
    if (totalThroneBattles < SIMULATION_RUNS * 2) {
      console.log('  ⚠️  Very few throne battles (< 2 per simulation)');
    } else if (totalThroneBattles > SIMULATION_RUNS * 15) {
      console.log('  ⚠️  Too many throne battles (> 15 per simulation)');
    } else {
      console.log('  ✅ Throne battle frequency is reasonable');
    }

    const successRate = successfulWarcalls / Math.max(totalWarcalls, 1);
    if (successRate < 0.4) {
      console.log('  ⚠️  Warcall success rate too low (< 40%)');
    } else if (successRate > 0.7) {
      console.log('  ⚠️  Warcall success rate too high (> 70%)');
    } else {
      console.log('  ✅ Warcall success rate is balanced');
    }

    expect(totalWarcalls).toBeGreaterThan(0);
  });

  it('Q5: should analyze POTENTIAL influence on careers', () => {
    console.log('\n====================================');
    console.log('Q5: POTENTIAL Stat Influence');
    console.log('====================================\n');

    const potentialStats: Record<string, {
      count: number;
      avgLevelGain: number;
      avgPromotions: number;
    }> = {};

    runs.forEach(run => {
      run.officers.forEach(officer => {
        const potential = officer.initialPotential;
        if (!potentialStats[potential]) {
          potentialStats[potential] = { count: 0, avgLevelGain: 0, avgPromotions: 0 };
        }

        const stats = potentialStats[potential];
        stats.count++;

        const levelGain = (officer.finalLevel || officer.initialLevel) - officer.initialLevel;
        stats.avgLevelGain += levelGain;

        const promotions = officer.ranks.length - 1;
        stats.avgPromotions += promotions;
      });
    });

    Object.values(potentialStats).forEach(stats => {
      if (stats.count > 0) {
        stats.avgLevelGain /= stats.count;
        stats.avgPromotions /= stats.count;
      }
    });

    console.log('POTENTIAL Rating Impact:\n');
    const potentialOrder = ['Unbrauchbar', 'Dumm', 'Normal', 'Fähig', 'Überdurchschnittlich', 'Genie'];
    
    potentialOrder.forEach(potential => {
      const stats = potentialStats[potential];
      if (stats) {
        console.log(`${potential} (${stats.count} officers):`);
        console.log(`  Avg level gain: ${stats.avgLevelGain.toFixed(2)}`);
        console.log(`  Avg promotions: ${stats.avgPromotions.toFixed(2)}`);
      }
    });

    console.log('\n💡 Balancing Insights:');
    const normalStats = potentialStats['Normal'];
    const genieStats = potentialStats['Genie'];
    
    if (normalStats && genieStats) {
      const levelGainDiff = genieStats.avgLevelGain - normalStats.avgLevelGain;
      
      if (levelGainDiff < 1) {
        console.log('  ⚠️  POTENTIAL has minimal impact on level progression');
      } else if (levelGainDiff > 5) {
        console.log('  ⚠️  POTENTIAL creates too much disparity');
      } else {
        console.log('  ✅ POTENTIAL has meaningful impact');
      }
    }
  });

  it('Q6: should validate RPG parameters', () => {
    console.log('\n====================================');
    console.log('Q6: RPG Parameter Validation');
    console.log('====================================\n');

    let minLevel = Infinity;
    let maxLevel = -Infinity;
    let avgLevel = 0;
    let count = 0;

    runs.forEach(run => {
      run.officers.forEach(officer => {
        const finalLevel = officer.finalLevel || officer.initialLevel;
        minLevel = Math.min(minLevel, finalLevel);
        maxLevel = Math.max(maxLevel, finalLevel);
        avgLevel += finalLevel;
        count++;
      });
    });

    avgLevel /= count;

    console.log('Level Distribution:');
    console.log(`  Min: ${minLevel}`);
    console.log(`  Max: ${maxLevel}`);
    console.log(`  Avg: ${avgLevel.toFixed(2)}`);

    console.log('\n💡 Balancing Insights:');
    if (maxLevel < 15) {
      console.log('  ⚠️  Max level too low (< 15)');
    } else if (maxLevel > 30) {
      console.log('  ⚠️  Max level too high (> 30)');
    } else {
      console.log('  ✅ Level progression range is reasonable');
    }

    if (avgLevel < 3) {
      console.log('  ⚠️  Average level too low (< 3)');
    } else if (avgLevel > 8) {
      console.log('  ⚠️  Average level too high (> 8)');
    } else {
      console.log('  ✅ Average level is balanced');
    }

    expect(avgLevel).toBeGreaterThan(1);
    expect(maxLevel).toBeGreaterThan(1);
  });

  it('Q7: should analyze simulation quality and memorability', () => {
    console.log('\n====================================');
    console.log('Q7: Simulation Quality & Memorability');
    console.log('====================================\n');

    let totalDeaths = 0;
    let totalSpawns = 0;
    let cyclesWithEvents = 0;
    
    runs.forEach(run => {
      run.cycles.forEach(cycle => {
        if (cycle.deaths > 0 || cycle.promotions > 0 || cycle.warcalls > 0) {
          cyclesWithEvents++;
        }
        totalDeaths += cycle.deaths;
        totalSpawns += cycle.spawns;
      });
    });

    const totalCycles = SIMULATION_RUNS * SIMULATION_CYCLES;
    const eventDensity = cyclesWithEvents / totalCycles;

    console.log('Event Density:');
    console.log(`  Cycles with events: ${(eventDensity * 100).toFixed(1)}%`);
    console.log(`  Deaths per cycle: ${(totalDeaths / totalCycles).toFixed(3)}`);
    console.log(`  Spawns per cycle: ${(totalSpawns / totalCycles).toFixed(3)}`);

    // Find memorable officers
    const memorableOfficers: Array<{ name: string; score: number; story: string }> = [];
    runs.forEach(run => {
      run.officers.forEach(officer => {
        let score = 0;
        
        if (officer.ranks.some(r => r.rank === 'König')) score += 10;
        if (officer.initialRank === 'Grunzer' && officer.ranks.some(r => r.rank === 'Captain')) score += 5;
        
        const levelGain = (officer.finalLevel || officer.initialLevel) - officer.initialLevel;
        if (levelGain > 8) score += 3;
        
        const survival = officer.died ? officer.died - officer.spawned : SIMULATION_CYCLES - officer.spawned;
        if (survival > 100) score += 2;
        
        if (score > 5) {
          memorableOfficers.push({
            name: officer.name,
            score,
            story: `${officer.name}: ${officer.initialRank} → ${officer.ranks[officer.ranks.length - 1].rank}, Lv${officer.initialLevel}→${officer.finalLevel || officer.initialLevel}, ${survival}cyc`
          });
        }
      });
    });

    memorableOfficers.sort((a, b) => b.score - a.score);

    console.log(`\nMemorable officers: ${memorableOfficers.length}`);
    console.log('\nTop 5:');
    memorableOfficers.slice(0, 5).forEach((officer, i) => {
      console.log(`  ${i + 1}. ${officer.story} (${officer.score})`);
    });

    console.log('\n💡 Balancing Insights:');
    if (eventDensity < 0.5) {
      console.log('  ⚠️  Too many quiet cycles (< 50% have events)');
    } else if (eventDensity > 0.95) {
      console.log('  ⚠️  Too many events (> 95% of cycles)');
    } else {
      console.log('  ✅ Event density creates good pacing');
    }

    if (memorableOfficers.length < 5) {
      console.log('  ⚠️  Very few memorable officers');
    } else {
      console.log(`  ✅ Generated ${memorableOfficers.length} memorable officers`);
    }

    expect(eventDensity).toBeGreaterThan(0.2);
  });

  it('Q8: should analyze death rates by rank and POTENTIAL influence', () => {
    console.log('\n====================================');
    console.log('Q8: Death Rate Analysis by Rank & POTENTIAL');
    console.log('====================================\n');

    const deathsByRank: Record<string, number> = {};
    const totalByRank: Record<string, number> = {};
    const deathsInWarcallByPotential: Record<string, { total: number; inWarcall: number; highRisk: number }> = {};

    runs.forEach(run => {
      run.officers.forEach(officer => {
        // Count all officers by their final rank
        const finalRank = officer.ranks[officer.ranks.length - 1]?.rank || officer.initialRank;
        totalByRank[finalRank] = (totalByRank[finalRank] || 0) + 1;

        if (officer.died !== null && officer.deathContext) {
          const deathRank = officer.deathContext.rank;
          deathsByRank[deathRank] = (deathsByRank[deathRank] || 0) + 1;

          // Track POTENTIAL influence on warcall deaths
          const potential = officer.deathContext.potential;
          if (!deathsInWarcallByPotential[potential]) {
            deathsInWarcallByPotential[potential] = { total: 0, inWarcall: 0, highRisk: 0 };
          }
          deathsInWarcallByPotential[potential].total++;
          
          if (officer.deathContext.inWarcall) {
            deathsInWarcallByPotential[potential].inWarcall++;
            if (officer.deathContext.warcallRisk && officer.deathContext.warcallRisk > 0.7) {
              deathsInWarcallByPotential[potential].highRisk++;
            }
          }
        }
      });
    });

    console.log('Death rates by rank:');
    ['Grunzer', 'Späher', 'Captain', 'König'].forEach(rank => {
      const deaths = deathsByRank[rank] || 0;
      const total = totalByRank[rank] || 1;
      const rate = (deaths / total) * 100;
      console.log(`  ${rank}: ${deaths}/${total} died (${rate.toFixed(1)}%)`);
    });

    console.log('\nPOTENTIAL influence on warcall deaths:');
    Object.entries(deathsInWarcallByPotential)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([potential, data]) => {
        const warcallRate = (data.inWarcall / data.total) * 100;
        const highRiskRate = data.inWarcall > 0 ? (data.highRisk / data.inWarcall) * 100 : 0;
        console.log(`  ${potential}: ${data.inWarcall}/${data.total} in warcall (${warcallRate.toFixed(1)}%), ${data.highRisk} in high-risk`);
      });

    console.log('\n💡 Balancing Insights:');
    const grunzerDeathRate = (deathsByRank['Grunzer'] || 0) / (totalByRank['Grunzer'] || 1);
    const captainDeathRate = (deathsByRank['Captain'] || 0) / (totalByRank['Captain'] || 1);
    
    if (grunzerDeathRate > 0.7) {
      console.log('  ⚠️  Grunzer die too frequently (> 70%)');
    } else if (grunzerDeathRate < 0.3) {
      console.log('  ⚠️  Grunzer survive too easily (< 30% death rate)');
    } else {
      console.log('  ✅ Grunzer death rate is balanced');
    }

    if (captainDeathRate > grunzerDeathRate * 0.8) {
      console.log('  ⚠️  Higher ranks should be more survivable than Grunzer');
    } else {
      console.log('  ✅ Higher ranks have better survival rates');
    }

    expect(Object.keys(deathsByRank).length).toBeGreaterThan(0);
  });

  it('Q9: should analyze alliance formation intelligence (mutual benefit)', () => {
    console.log('\n====================================');
    console.log('Q9: Alliance Intelligence Analysis');
    console.log('====================================\n');

    let totalAllyPairs = 0;
    let mutuallyBeneficialPairs = 0;
    let antiKingPairs = 0;

    runs.forEach(run => {
      run.alliances.forEach(alliance => {
        alliance.allyPairs.forEach(pair => {
          totalAllyPairs++;
          
          // Mutual benefit: both should have similar merit (not one dominating)
          const meritDiff = Math.abs(pair.officer1Merit - pair.officer2Merit);
          const avgMerit = (pair.officer1Merit + pair.officer2Merit) / 2;
          const meritRatio = meritDiff / Math.max(avgMerit, 1);
          
          // Consider mutually beneficial if merit difference is < 50% of average
          if (meritRatio < 0.5) {
            mutuallyBeneficialPairs++;
          }
          
          if (pair.bothRivalsOfKing) {
            antiKingPairs++;
          }
        });
      });
    });

    const mutualBenefitRate = totalAllyPairs > 0 ? (mutuallyBeneficialPairs / totalAllyPairs) * 100 : 0;
    const antiKingRate = totalAllyPairs > 0 ? (antiKingPairs / totalAllyPairs) * 100 : 0;

    console.log(`Total ally pairs tracked: ${totalAllyPairs}`);
    console.log(`Mutually beneficial (similar merit): ${mutuallyBeneficialPairs} (${mutualBenefitRate.toFixed(1)}%)`);
    console.log(`Both rivals of König: ${antiKingPairs} (${antiKingRate.toFixed(1)}%)`);

    console.log('\n💡 Balancing Insights:');
    if (mutualBenefitRate < 40) {
      console.log('  ⚠️  Too many one-sided alliances (< 40% mutual benefit)');
      console.log('     - Officers might be allying randomly rather than strategically');
    } else if (mutualBenefitRate > 80) {
      console.log('  ⚠️  Alliances too perfectly balanced (> 80% mutual benefit)');
      console.log('     - System might be too restrictive');
    } else {
      console.log('  ✅ Alliance formation shows intelligent mutual benefit patterns');
    }

    if (antiKingRate > 30) {
      console.log('  ✅ Many alliances form strategically against the König');
    } else {
      console.log('  ℹ️  Alliances are not primarily anti-König focused');
    }
  });

  it('Q10: should analyze rival behavior intelligence', () => {
    console.log('\n====================================');
    console.log('Q10: Rival Behavior Intelligence');
    console.log('====================================\n');

    let totalRivalPairs = 0;
    let rivalsSameWarcall = 0;
    let highMeritRivalries = 0;

    runs.forEach(run => {
      run.rivalBehaviors.forEach(rivalry => {
        totalRivalPairs++;
        
        if (rivalry.bothInSameWarcall) {
          rivalsSameWarcall++;
        }
        
        // High-stakes rivalry: both have significant merit
        if (rivalry.officer1Merit > 100 && rivalry.officer2Merit > 100) {
          highMeritRivalries++;
        }
      });
    });

    const sameWarcallRate = totalRivalPairs > 0 ? (rivalsSameWarcall / totalRivalPairs) * 100 : 0;
    const highStakesRate = totalRivalPairs > 0 ? (highMeritRivalries / totalRivalPairs) * 100 : 0;

    console.log(`Total rival pairs tracked: ${totalRivalPairs}`);
    console.log(`Rivals in same warcall: ${rivalsSameWarcall} (${sameWarcallRate.toFixed(1)}%)`);
    console.log(`High-stakes rivalries (both >100 merit): ${highMeritRivalries} (${highStakesRate.toFixed(1)}%)`);

    console.log('\n💡 Balancing Insights:');
    if (sameWarcallRate > 30) {
      console.log('  ⚠️  Rivals cooperate in warcalls too often (> 30%)');
      console.log('     - Rivalries should make cooperation less likely');
    } else if (sameWarcallRate < 5) {
      console.log('  ⚠️  Rivals avoid each other completely (< 5%)');
      console.log('     - Some cooperation should still be possible');
    } else {
      console.log('  ✅ Rival behavior shows intelligent reluctance to cooperate');
    }

    if (highStakesRate < 20) {
      console.log('  ℹ️  Most rivalries form early (low merit officers)');
    } else {
      console.log('  ✅ Many rivalries form between established officers');
    }
  });

  it('Q11: should analyze mission selection intelligence (ambition-based)', () => {
    console.log('\n====================================');
    console.log('Q11: Mission Selection Intelligence');
    console.log('====================================\n');

    let totalWarcalls = 0;
    let highRiskHighReward = 0;
    let lowRiskLowReward = 0;
    let complexMissions = 0;

    runs.forEach(run => {
      run.warcalls.forEach(warcall => {
        totalWarcalls++;
        
        // Categorize missions
        const isHighRisk = warcall.risk > 0.7;
        const isHighDifficulty = warcall.baseDifficulty > 0.6;
        const isComplex = ['Infiltration', 'Eroberung', 'Sabotage'].includes(warcall.kind);
        
        if (isHighRisk && isHighDifficulty) {
          highRiskHighReward++;
        } else if (warcall.risk < 0.3 && warcall.baseDifficulty < 0.4) {
          lowRiskLowReward++;
        }
        
        if (isComplex) {
          complexMissions++;
        }
      });
    });

    const highRiskRate = (highRiskHighReward / totalWarcalls) * 100;
    const lowRiskRate = (lowRiskLowReward / totalWarcalls) * 100;
    const complexRate = (complexMissions / totalWarcalls) * 100;

    console.log(`Total warcalls: ${totalWarcalls}`);
    console.log(`High-risk/high-difficulty: ${highRiskHighReward} (${highRiskRate.toFixed(1)}%)`);
    console.log(`Low-risk/low-difficulty: ${lowRiskLowReward} (${lowRiskRate.toFixed(1)}%)`);
    console.log(`Complex missions (Infiltration/Eroberung/Sabotage): ${complexMissions} (${complexRate.toFixed(1)}%)`);

    console.log('\n💡 Balancing Insights:');
    if (highRiskRate > 40) {
      console.log('  ⚠️  Too many high-risk missions (> 40%)');
      console.log('     - Officers might not be considering risk appropriately');
    } else if (highRiskRate < 10) {
      console.log('  ⚠️  Too few challenging missions (< 10%)');
      console.log('     - Simulation might lack tension');
    } else {
      console.log('  ✅ Good balance of mission risk levels');
    }

    if (complexRate > 15 && complexRate < 35) {
      console.log('  ✅ Complex missions provide variety without overwhelming');
    } else if (complexRate < 15) {
      console.log('  ℹ️  Complex missions are rare (adds exclusivity)');
    } else {
      console.log('  ⚠️  Too many complex missions (> 35%)');
    }

    expect(totalWarcalls).toBeGreaterThan(0);
  });

  it('Q12: should analyze risk awareness in high-risk warcalls', () => {
    console.log('\n====================================');
    console.log('Q12: Risk Awareness Analysis');
    console.log('====================================\n');

    let highRiskWarcalls = 0;
    let deathsInHighRisk = 0;
    let successInHighRisk = 0;
    let participantsInHighRisk = 0;

    runs.forEach(run => {
      run.warcalls.forEach(warcall => {
        if (warcall.risk > 0.7) {
          highRiskWarcalls++;
          deathsInHighRisk += warcall.casualties;
          participantsInHighRisk += warcall.participants;
          
          if (warcall.success) {
            successInHighRisk++;
          }
        }
      });
    });

    const avgParticipants = highRiskWarcalls > 0 ? participantsInHighRisk / highRiskWarcalls : 0;
    const casualtyRate = participantsInHighRisk > 0 ? (deathsInHighRisk / participantsInHighRisk) * 100 : 0;
    const successRate = highRiskWarcalls > 0 ? (successInHighRisk / highRiskWarcalls) * 100 : 0;

    console.log(`High-risk warcalls (risk > 0.7): ${highRiskWarcalls}`);
    console.log(`Average participants per high-risk mission: ${avgParticipants.toFixed(2)}`);
    console.log(`Casualty rate in high-risk: ${casualtyRate.toFixed(1)}%`);
    console.log(`Success rate in high-risk: ${successRate.toFixed(1)}%`);

    console.log('\n💡 Balancing Insights:');
    if (casualtyRate > 50) {
      console.log('  ⚠️  High-risk missions are too deadly (> 50% casualties)');
      console.log('     - Officers should avoid these "suicide missions"');
    } else if (casualtyRate < 10) {
      console.log('  ⚠️  High-risk missions not risky enough (< 10% casualties)');
      console.log('     - Risk rating might be misleading');
    } else {
      console.log('  ✅ High-risk missions have appropriate consequences');
    }

    if (avgParticipants > 3) {
      console.log('  ℹ️  Officers team up for high-risk missions (strength in numbers)');
    } else {
      console.log('  ✅ High-risk missions involve smaller, specialized teams');
    }

    if (successRate < 30) {
      console.log('  ⚠️  High-risk missions rarely succeed (< 30%)');
      console.log('     - Might discourage participation');
    } else if (successRate > 70) {
      console.log('  ⚠️  High-risk missions too rewarding (> 70% success)');
      console.log('     - Risk/reward balance might be off');
    } else {
      console.log('  ✅ High-risk missions have balanced success rates');
    }

    expect(highRiskWarcalls).toBeGreaterThan(0);
  });
});
