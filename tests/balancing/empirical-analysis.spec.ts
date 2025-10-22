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
  }>;
  alliances: Array<{
    cycle: number;
    kingId: string;
    rivalCount: number;
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
        runData.officers.get(deadId)!.died = cycle;
        const deadOfficer = world.graveyard.find(o => o.id === deadId);
        if (deadOfficer) {
          runData.officers.get(deadId)!.finalLevel = deadOfficer.stats.level;
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
          casualties: resolution.casualties.length
        });
      }
    });

    // Track alliances against king
    const king = world.officers.find(o => o.id === currentKingId);
    if (king) {
      const rivalsOfKing = world.officers.filter(o => 
        o.relationships.some(rel => rel.type === 'RIVAL' && rel.with === king.id)
      );
      
      if (rivalsOfKing.length >= 2) {
        runData.alliances.push({
          cycle,
          kingId: currentKingId,
          rivalCount: rivalsOfKing.length
        });
      }
    }
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
});
