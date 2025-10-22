#!/usr/bin/env node
/**
 * Empirical Balancing Analysis Tool for ORCS SPECTATE Mode
 * 
 * This tool runs multiple simulation cycles and analyzes:
 * 1. King survival duration (average cycles)
 * 2. Grunzer → König career progression probability
 * 3. Alliance formation frequency and strength against König
 * 4. Clash frequency (throne battles, warcalls)
 * 5. POTENTIAL stat influence on career paths
 * 6. RPG parameter validation (stats, traits, level progression)
 * 7. Additional simulation authenticity metrics
 * 
 * Goal: Ensure the simulation is authentic, fun, understandable, and occasionally surprising.
 */

import { RNG } from '../../src/sim/rng.ts';
import { createWorld } from '../../src/sim/world.ts';
import { advanceCycle } from '../../src/sim/cycle.ts';

const SIMULATION_CYCLES = 200; // Number of cycles to simulate
const SIMULATION_RUNS = 10; // Number of independent runs

class SimulationAnalyzer {
  constructor() {
    this.runs = [];
  }

  /**
   * Run a complete simulation and collect data
   */
  runSimulation(runId, seed) {
    const rng = new RNG(seed);
    const world = createWorld(rng, 0);
    
    const runData = {
      id: runId,
      seed,
      kings: [], // Track all kings: { id, name, startCycle, endCycle, endReason }
      officers: new Map(), // Track officer careers: id -> { spawned, promoted, demoted, died, ranks[] }
      throneBattles: [], // Track throne battles
      warcalls: [], // Track all warcalls
      alliances: [], // Track alliances against king
      levelUps: [], // Track level progressions
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
        endReason: null,
        stats: { ...initialKing.stats },
        traits: [...initialKing.traits]
      });
    }

    // Initialize officer tracking
    world.officers.forEach(officer => {
      runData.officers.set(officer.id, {
        id: officer.id,
        name: officer.name,
        stableId: officer.stableId,
        spawned: officer.cycleJoined,
        initialRank: officer.rank,
        initialPotential: officer.stats.potential,
        initialLevel: officer.stats.level,
        initialTraits: [...officer.traits],
        ranks: [{ rank: officer.rank, cycle: 0, merit: officer.merit }],
        died: null,
        finalLevel: null,
        levelUps: []
      });
    });

    // Run simulation
    for (let cycle = 1; cycle <= SIMULATION_CYCLES; cycle++) {
      const summary = advanceCycle(world, rng);
      
      // Track cycle data
      const cycleData = {
        cycle,
        kingId: world.kingId,
        kingStatus: world.kingStatus,
        crownPressure: world.crown.crownPressure,
        instability: world.crown.instability,
        totalOfficers: world.officers.length,
        deaths: summary.deaths.length,
        spawns: summary.spawns.length,
        promotions: summary.promotions.length,
        warcalls: summary.warcallsResolved.length
      };
      runData.cycles.push(cycleData);

      // Check for king changes
      const currentKingId = world.kingId;
      const lastKing = runData.kings[runData.kings.length - 1];
      if (lastKing && lastKing.id !== currentKingId) {
        // King changed
        lastKing.endCycle = cycle;
        lastKing.endReason = summary.deaths.includes(lastKing.id) ? 'DEATH' : 'OVERTHROWN';
        
        const newKing = world.officers.find(o => o.id === currentKingId);
        if (newKing) {
          runData.kings.push({
            id: newKing.id,
            name: newKing.name,
            startCycle: cycle,
            endCycle: null,
            endReason: null,
            stats: { ...newKing.stats },
            traits: [...newKing.traits]
          });
        }
      }

      // Track deaths
      summary.deaths.forEach(deadId => {
        if (runData.officers.has(deadId)) {
          runData.officers.get(deadId).died = cycle;
          const deadOfficer = world.graveyard.find(o => o.id === deadId);
          if (deadOfficer) {
            runData.officers.get(deadId).finalLevel = deadOfficer.stats.level;
          }
        }
      });

      // Track spawns
      summary.spawns.forEach(spawn => {
        runData.officers.set(spawn.id, {
          id: spawn.id,
          name: spawn.name,
          stableId: spawn.stableId,
          spawned: cycle,
          initialRank: spawn.rank,
          initialPotential: spawn.stats.potential,
          initialLevel: spawn.stats.level,
          initialTraits: [...spawn.traits],
          ranks: [{ rank: spawn.rank, cycle, merit: spawn.merit }],
          died: null,
          finalLevel: null,
          levelUps: []
        });
      });

      // Track promotions
      summary.promotions.forEach(promo => {
        if (runData.officers.has(promo.officerId)) {
          const officer = world.officers.find(o => o.id === promo.officerId);
          if (officer) {
            runData.officers.get(promo.officerId).ranks.push({
              rank: promo.to,
              cycle,
              merit: officer.merit
            });
          }
        }
      });

      // Track throne battles
      summary.warcallsResolved.forEach(resolution => {
        if (resolution.warcall.kind === 'Thronschlacht') {
          runData.throneBattles.push({
            cycle,
            kingId: currentKingId,
            success: resolution.success,
            participants: resolution.warcall.participants,
            casualties: resolution.casualties,
            breakdown: resolution.warcall.breakdown
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

      // Track level ups
      world.officers.forEach(officer => {
        const tracked = runData.officers.get(officer.id);
        if (tracked) {
          const lastLevel = tracked.levelUps.length > 0 
            ? tracked.levelUps[tracked.levelUps.length - 1].level 
            : tracked.initialLevel;
          
          if (officer.stats.level > lastLevel) {
            tracked.levelUps.push({
              cycle,
              level: officer.stats.level,
              potential: officer.stats.potential,
              merit: officer.merit
            });
          }
        }
      });

      // Track alliances against king
      const king = world.officers.find(o => o.id === currentKingId);
      if (king) {
        const rivalsOfKing = world.officers.filter(o => 
          o.relationships.some(rel => rel.type === 'RIVAL' && rel.with === king.id)
        );
        
        if (rivalsOfKing.length >= 2) {
          // Check if rivals have alliances among themselves
          const allianceNetwork = [];
          rivalsOfKing.forEach(rival => {
            const allies = rival.relationships
              .filter(rel => rel.type === 'ALLY')
              .map(rel => rivalsOfKing.find(r => r.id === rel.with))
              .filter(a => a);
            
            if (allies.length > 0) {
              allianceNetwork.push({
                leader: rival.id,
                allies: allies.map(a => a.id),
                totalMerit: rival.merit + allies.reduce((sum, a) => sum + a.merit, 0)
              });
            }
          });

          if (allianceNetwork.length > 0) {
            runData.alliances.push({
              cycle,
              kingId: currentKingId,
              rivalCount: rivalsOfKing.length,
              alliances: allianceNetwork
            });
          }
        }
      }
    }

    // Finalize data
    const finalKing = runData.kings[runData.kings.length - 1];
    if (finalKing && !finalKing.endCycle) {
      finalKing.endCycle = SIMULATION_CYCLES;
      finalKing.endReason = 'SIMULATION_END';
    }

    // Update final levels for surviving officers
    world.officers.forEach(officer => {
      if (runData.officers.has(officer.id)) {
        runData.officers.get(officer.id).finalLevel = officer.stats.level;
      }
    });

    return runData;
  }

  /**
   * Run multiple simulations
   */
  async runMultiple() {
    console.log(`\n=== Running ${SIMULATION_RUNS} simulations with ${SIMULATION_CYCLES} cycles each ===\n`);
    
    for (let i = 0; i < SIMULATION_RUNS; i++) {
      const seed = Date.now() + i * 1000;
      console.log(`Running simulation ${i + 1}/${SIMULATION_RUNS} (seed: ${seed})...`);
      const runData = this.runSimulation(i, seed);
      this.runs.push(runData);
    }
    
    console.log(`\n=== Completed ${SIMULATION_RUNS} simulations ===\n`);
  }

  /**
   * Question 1: How long does a King survive on average?
   */
  analyzeKingSurvival() {
    console.log('\n====================================');
    console.log('Q1: King Survival Analysis');
    console.log('====================================\n');

    const allKings = this.runs.flatMap(run => run.kings);
    const survivals = allKings
      .filter(k => k.endCycle !== null)
      .map(k => k.endCycle - k.startCycle);

    if (survivals.length === 0) {
      console.log('⚠️  No king changes detected in any simulation run.');
      return;
    }

    const avgSurvival = survivals.reduce((sum, s) => sum + s, 0) / survivals.length;
    const minSurvival = Math.min(...survivals);
    const maxSurvival = Math.max(...survivals);
    const medianSurvival = survivals.sort((a, b) => a - b)[Math.floor(survivals.length / 2)];

    console.log(`Total kings tracked: ${allKings.length}`);
    console.log(`Kings that were replaced: ${survivals.length}`);
    console.log(`Average survival: ${avgSurvival.toFixed(1)} cycles`);
    console.log(`Median survival: ${medianSurvival} cycles`);
    console.log(`Min survival: ${minSurvival} cycles`);
    console.log(`Max survival: ${maxSurvival} cycles`);

    // Death reasons
    const deathReasons = allKings
      .filter(k => k.endReason)
      .reduce((acc, k) => {
        acc[k.endReason] = (acc[k.endReason] || 0) + 1;
        return acc;
      }, {});

    console.log('\nKing end reasons:');
    Object.entries(deathReasons).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count} (${((count / Object.values(deathReasons).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`);
    });

    // Recommendations
    console.log('\n💡 Balancing Insights:');
    if (avgSurvival < 20) {
      console.log('  ⚠️  Kings change too frequently (< 20 cycles). Consider:');
      console.log('     - Reducing crown pressure gain rate');
      console.log('     - Increasing king strength in throne battles');
      console.log('     - Making loyalists more effective');
    } else if (avgSurvival > 80) {
      console.log('  ⚠️  Kings rule too long (> 80 cycles). Consider:');
      console.log('     - Increasing crown pressure gain rate');
      console.log('     - Making challengers stronger');
      console.log('     - Increasing instability effects');
    } else {
      console.log('  ✅ King survival duration seems reasonable (20-80 cycles)');
    }
  }

  /**
   * Question 2: What are the chances of Grunzer → König progression?
   */
  analyzeCareerProgression() {
    console.log('\n====================================');
    console.log('Q2: Career Progression Analysis (Grunzer → König)');
    console.log('====================================\n');

    let grunzerCount = 0;
    let becameKingCount = 0;
    let reachedCaptainCount = 0;
    let reachedSpaeherCount = 0;

    this.runs.forEach(run => {
      run.officers.forEach(officer => {
        if (officer.initialRank === 'Grunzer') {
          grunzerCount++;
          const ranks = officer.ranks.map(r => r.rank);
          
          if (ranks.includes('König')) {
            becameKingCount++;
          }
          if (ranks.includes('Captain')) {
            reachedCaptainCount++;
          }
          if (ranks.includes('Späher')) {
            reachedSpaeherCount++;
          }
        }
      });
    });

    console.log(`Total Grunzer spawned: ${grunzerCount}`);
    console.log(`Became König: ${becameKingCount} (${((becameKingCount / grunzerCount) * 100).toFixed(2)}%)`);
    console.log(`Reached Captain: ${reachedCaptainCount} (${((reachedCaptainCount / grunzerCount) * 100).toFixed(2)}%)`);
    console.log(`Reached Späher: ${reachedSpaeherCount} (${((reachedSpaeherCount / grunzerCount) * 100).toFixed(2)}%)`);

    // Analyze by potential
    const potentialBreakdown = {};
    this.runs.forEach(run => {
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
      console.log(`\n  ${potential} (${data.total} officers):`);
      console.log(`    → Späher: ${((data.spaeher / data.total) * 100).toFixed(1)}%`);
      console.log(`    → Captain: ${((data.captain / data.total) * 100).toFixed(1)}%`);
      console.log(`    → König: ${((data.koenig / data.total) * 100).toFixed(2)}%`);
    });

    console.log('\n💡 Balancing Insights:');
    if (becameKingCount === 0) {
      console.log('  ⚠️  No Grunzer became König in any simulation!');
      console.log('     - This might be too restrictive');
      console.log('     - Consider making progression faster or reducing king stability');
    } else if ((becameKingCount / grunzerCount) > 0.05) {
      console.log('  ⚠️  Too many Grunzer become König (> 5%)');
      console.log('     - Throne should be more exclusive');
    } else {
      console.log('  ✅ König progression rate seems reasonable (rare but possible)');
    }

    if ((reachedCaptainCount / grunzerCount) < 0.1) {
      console.log('  ⚠️  Very few Grunzer reach Captain (< 10%)');
      console.log('     - Consider reducing promotion thresholds');
    }
  }

  /**
   * Question 3: Alliance formation against König
   */
  analyzeAlliances() {
    console.log('\n====================================');
    console.log('Q3: Alliance Formation Against König');
    console.log('====================================\n');

    let totalAllianceEvents = 0;
    let maxAllianceStrength = 0;
    let avgAllianceSize = 0;

    this.runs.forEach(run => {
      totalAllianceEvents += run.alliances.length;
      
      run.alliances.forEach(alliance => {
        const totalSize = alliance.alliances.reduce((sum, a) => sum + a.allies.length + 1, 0);
        avgAllianceSize += totalSize;
        
        const totalMerit = alliance.alliances.reduce((sum, a) => sum + a.totalMerit, 0);
        maxAllianceStrength = Math.max(maxAllianceStrength, totalMerit);
      });
    });

    if (totalAllianceEvents > 0) {
      avgAllianceSize /= totalAllianceEvents;
    }

    console.log(`Total alliance events detected: ${totalAllianceEvents}`);
    console.log(`Average alliance size: ${avgAllianceSize.toFixed(1)} officers`);
    console.log(`Max alliance strength (merit): ${maxAllianceStrength}`);
    console.log(`Alliance events per 100 cycles: ${((totalAllianceEvents / (SIMULATION_RUNS * SIMULATION_CYCLES)) * 100).toFixed(1)}`);

    console.log('\n💡 Balancing Insights:');
    if (totalAllianceEvents === 0) {
      console.log('  ⚠️  No alliances detected against König!');
      console.log('     - Relationship system might be too weak');
      console.log('     - Consider increasing rivalry formation');
    } else if (totalAllianceEvents > SIMULATION_RUNS * 20) {
      console.log('  ⚠️  Too many alliances (> 20 per simulation)');
      console.log('     - Might make simulation feel chaotic');
    } else {
      console.log('  ✅ Alliance frequency seems reasonable');
    }
  }

  /**
   * Question 4: Clash frequency (throne battles vs warcalls)
   */
  analyzeClashes() {
    console.log('\n====================================');
    console.log('Q4: Clash Frequency Analysis');
    console.log('====================================\n');

    let totalThroneBattles = 0;
    let successfulCoups = 0;
    let totalWarcalls = 0;
    let successfulWarcalls = 0;

    this.runs.forEach(run => {
      totalThroneBattles += run.throneBattles.length;
      successfulCoups += run.throneBattles.filter(b => b.success).length;
      totalWarcalls += run.warcalls.length;
      successfulWarcalls += run.warcalls.filter(w => w.success).length;
    });

    console.log(`Total throne battles: ${totalThroneBattles}`);
    console.log(`Successful coups: ${successfulCoups} (${((successfulCoups / Math.max(totalThroneBattles, 1)) * 100).toFixed(1)}%)`);
    console.log(`Throne battles per 100 cycles: ${((totalThroneBattles / (SIMULATION_RUNS * SIMULATION_CYCLES)) * 100).toFixed(1)}`);
    
    console.log(`\nTotal warcalls: ${totalWarcalls}`);
    console.log(`Successful warcalls: ${successfulWarcalls} (${((successfulWarcalls / Math.max(totalWarcalls, 1)) * 100).toFixed(1)}%)`);
    console.log(`Warcalls per cycle: ${(totalWarcalls / (SIMULATION_RUNS * SIMULATION_CYCLES)).toFixed(2)}`);

    // Warcall type breakdown
    const warcallTypes = {};
    this.runs.forEach(run => {
      run.warcalls.forEach(w => {
        warcallTypes[w.kind] = (warcallTypes[w.kind] || 0) + 1;
      });
    });

    console.log('\nWarcall type distribution:');
    Object.entries(warcallTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([kind, count]) => {
        console.log(`  ${kind}: ${count} (${((count / totalWarcalls) * 100).toFixed(1)}%)`);
      });

    console.log('\n💡 Balancing Insights:');
    if (totalThroneBattles < SIMULATION_RUNS * 2) {
      console.log('  ⚠️  Very few throne battles (< 2 per simulation)');
      console.log('     - Consider increasing crown pressure or rivalry formation');
    } else if (totalThroneBattles > SIMULATION_RUNS * 15) {
      console.log('  ⚠️  Too many throne battles (> 15 per simulation)');
      console.log('     - Throne might be too unstable');
    } else {
      console.log('  ✅ Throne battle frequency seems reasonable');
    }

    if ((successfulWarcalls / Math.max(totalWarcalls, 1)) < 0.4) {
      console.log('  ⚠️  Warcall success rate too low (< 40%)');
      console.log('     - Might be too punishing, consider easier difficulty');
    } else if ((successfulWarcalls / Math.max(totalWarcalls, 1)) > 0.7) {
      console.log('  ⚠️  Warcall success rate too high (> 70%)');
      console.log('     - Might be too easy, consider harder difficulty');
    } else {
      console.log('  ✅ Warcall success rate seems balanced');
    }
  }

  /**
   * Question 5: POTENTIAL influence on careers
   */
  analyzePotentialInfluence() {
    console.log('\n====================================');
    console.log('Q5: POTENTIAL Stat Influence on Career');
    console.log('====================================\n');

    const potentialStats = {};

    this.runs.forEach(run => {
      run.officers.forEach(officer => {
        const potential = officer.initialPotential;
        if (!potentialStats[potential]) {
          potentialStats[potential] = {
            count: 0,
            avgLevelGain: 0,
            avgPromotions: 0,
            avgSurvival: 0,
            becameKing: 0
          };
        }

        const stats = potentialStats[potential];
        stats.count++;

        const levelGain = (officer.finalLevel || officer.initialLevel) - officer.initialLevel;
        stats.avgLevelGain += levelGain;

        const promotions = officer.ranks.length - 1;
        stats.avgPromotions += promotions;

        if (officer.died !== null) {
          stats.avgSurvival += officer.died - officer.spawned;
        } else {
          stats.avgSurvival += SIMULATION_CYCLES - officer.spawned;
        }

        if (officer.ranks.some(r => r.rank === 'König')) {
          stats.becameKing++;
        }
      });
    });

    // Calculate averages
    Object.values(potentialStats).forEach(stats => {
      if (stats.count > 0) {
        stats.avgLevelGain /= stats.count;
        stats.avgPromotions /= stats.count;
        stats.avgSurvival /= stats.count;
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
        console.log(`  Avg survival: ${stats.avgSurvival.toFixed(1)} cycles`);
        console.log(`  Became König: ${stats.becameKing} (${((stats.becameKing / stats.count) * 100).toFixed(2)}%)`);
        console.log('');
      }
    });

    console.log('💡 Balancing Insights:');
    
    // Check if potential has meaningful impact
    const normalStats = potentialStats['Normal'];
    const genieStats = potentialStats['Genie'];
    
    if (normalStats && genieStats) {
      const levelGainDiff = genieStats.avgLevelGain - normalStats.avgLevelGain;
      const promotionDiff = genieStats.avgPromotions - normalStats.avgPromotions;
      
      if (levelGainDiff < 1) {
        console.log('  ⚠️  POTENTIAL has minimal impact on level progression');
        console.log('     - Consider increasing stat gain differences between potential ratings');
      } else if (levelGainDiff > 5) {
        console.log('  ⚠️  POTENTIAL creates too much disparity in level progression');
        console.log('     - High potential officers might dominate too much');
      } else {
        console.log('  ✅ POTENTIAL has meaningful but not overwhelming impact on levels');
      }

      if (promotionDiff < 0.3) {
        console.log('  ⚠️  POTENTIAL has minimal impact on promotion rates');
        console.log('     - Merit system might need to better reward higher stats');
      } else {
        console.log('  ✅ POTENTIAL influences promotion rates meaningfully');
      }
    }
  }

  /**
   * Question 6: RPG parameter validation
   */
  analyzeRPGParameters() {
    console.log('\n====================================');
    console.log('Q6: RPG Parameter Validation');
    console.log('====================================\n');

    // Collect stat distributions
    const statRanges = {
      level: { min: Infinity, max: -Infinity, avg: 0, count: 0 }
    };

    this.runs.forEach(run => {
      run.officers.forEach(officer => {
        // Use final level if available
        const finalLevel = officer.finalLevel || officer.initialLevel;
        
        statRanges.level.min = Math.min(statRanges.level.min, finalLevel);
        statRanges.level.max = Math.max(statRanges.level.max, finalLevel);
        statRanges.level.avg += finalLevel;
        statRanges.level.count++;
      });
    });

    // Calculate averages
    if (statRanges.level.count > 0) {
      statRanges.level.avg /= statRanges.level.count;
    }

    console.log('Level Distribution:');
    console.log(`  Min: ${statRanges.level.min}`);
    console.log(`  Max: ${statRanges.level.max}`);
    console.log(`  Avg: ${statRanges.level.avg.toFixed(2)}`);

    // Analyze trait distribution
    const traitCounts = {};
    this.runs.forEach(run => {
      run.officers.forEach(officer => {
        officer.initialTraits.forEach(trait => {
          traitCounts[trait] = (traitCounts[trait] || 0) + 1;
        });
      });
    });

    console.log('\nTrait Distribution (Top 10):');
    Object.entries(traitCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([trait, count]) => {
        console.log(`  ${trait}: ${count}`);
      });

    console.log('\n💡 Balancing Insights:');
    
    if (statRanges.level.max < 15) {
      console.log('  ⚠️  Max level too low (< 15)');
      console.log('     - Officers might not progress enough');
      console.log('     - Consider increasing experience gain or reducing level requirements');
    } else if (statRanges.level.max > 30) {
      console.log('  ⚠️  Max level too high (> 30)');
      console.log('     - Might create too much power disparity');
    } else {
      console.log('  ✅ Level progression range seems reasonable');
    }

    if (statRanges.level.avg < 3) {
      console.log('  ⚠️  Average level too low (< 3)');
      console.log('     - Officers die before gaining much experience');
    } else if (statRanges.level.avg > 8) {
      console.log('  ⚠️  Average level too high (> 8)');
      console.log('     - Officers might be surviving too long');
    } else {
      console.log('  ✅ Average level seems balanced');
    }
  }

  /**
   * Question 7: Additional simulation quality metrics
   */
  analyzeSimulationQuality() {
    console.log('\n====================================');
    console.log('Q7: Simulation Quality & Memorability');
    console.log('====================================\n');

    // Death rate analysis
    let totalDeaths = 0;
    let totalSpawns = 0;
    let cyclesWithEvents = 0;
    
    this.runs.forEach(run => {
      run.cycles.forEach(cycle => {
        if (cycle.deaths > 0 || cycle.promotions > 0 || cycle.warcalls > 0) {
          cyclesWithEvents++;
        }
        totalDeaths += cycle.deaths;
        totalSpawns += cycle.spawns;
      });
    });

    const totalCycles = SIMULATION_RUNS * SIMULATION_CYCLES;
    const deathsPerCycle = totalDeaths / totalCycles;
    const spawnsPerCycle = totalSpawns / totalCycles;
    const eventDensity = cyclesWithEvents / totalCycles;

    console.log('Event Density:');
    console.log(`  Cycles with events: ${(eventDensity * 100).toFixed(1)}%`);
    console.log(`  Deaths per cycle: ${deathsPerCycle.toFixed(3)}`);
    console.log(`  Spawns per cycle: ${spawnsPerCycle.toFixed(3)}`);

    // Find memorable officers (high achievements)
    const memorableOfficers = [];
    this.runs.forEach(run => {
      run.officers.forEach(officer => {
        let memorabilityScore = 0;
        
        // Became king
        if (officer.ranks.some(r => r.rank === 'König')) {
          memorabilityScore += 10;
        }
        
        // Reached Captain from Grunzer
        if (officer.initialRank === 'Grunzer' && officer.ranks.some(r => r.rank === 'Captain')) {
          memorabilityScore += 5;
        }
        
        // High level gain
        const levelGain = (officer.finalLevel || officer.initialLevel) - officer.initialLevel;
        if (levelGain > 8) {
          memorabilityScore += 3;
        }
        
        // Long survival
        const survival = officer.died ? officer.died - officer.spawned : SIMULATION_CYCLES - officer.spawned;
        if (survival > 100) {
          memorabilityScore += 2;
        }
        
        if (memorabilityScore > 5) {
          memorableOfficers.push({
            name: officer.name,
            score: memorabilityScore,
            story: `${officer.name}: ${officer.initialRank} → ${officer.ranks[officer.ranks.length - 1].rank}, Level ${officer.initialLevel} → ${officer.finalLevel || officer.initialLevel}, Survived ${survival} cycles`
          });
        }
      });
    });

    memorableOfficers.sort((a, b) => b.score - a.score);

    console.log(`\nMemorable Officers (score > 5): ${memorableOfficers.length}`);
    console.log('\nTop 5 Most Memorable:');
    memorableOfficers.slice(0, 5).forEach((officer, i) => {
      console.log(`  ${i + 1}. ${officer.story} (Score: ${officer.score})`);
    });

    console.log('\n💡 Balancing Insights:');
    
    if (eventDensity < 0.5) {
      console.log('  ⚠️  Too many "quiet" cycles (< 50% have events)');
      console.log('     - Simulation might feel static');
      console.log('     - Consider increasing warcall frequency');
    } else if (eventDensity > 0.95) {
      console.log('  ⚠️  Too many events (> 95% of cycles)');
      console.log('     - Simulation might feel overwhelming');
    } else {
      console.log('  ✅ Event density creates good pacing');
    }

    if (memorableOfficers.length < 5) {
      console.log('  ⚠️  Very few memorable officers generated');
      console.log('     - Consider making exceptional achievements more common');
      console.log('     - Or giving officers more unique traits/stories');
    } else {
      console.log(`  ✅ Generated ${memorableOfficers.length} memorable officers across simulations`);
    }

    if (Math.abs(deathsPerCycle - spawnsPerCycle) > 0.1) {
      console.log('  ⚠️  Death/spawn rate imbalance');
      console.log(`     - Deaths: ${deathsPerCycle.toFixed(3)}/cycle, Spawns: ${spawnsPerCycle.toFixed(3)}/cycle`);
    } else {
      console.log('  ✅ Death/spawn rates are balanced');
    }
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    console.log('\n\n========================================');
    console.log('SUMMARY: Balancing Recommendations');
    console.log('========================================\n');

    console.log('Based on the empirical analysis, here are the key findings:\n');
    
    console.log('1. King Stability: ');
    console.log('   Review Q1 analysis to determine if kings rule too long or too short\n');
    
    console.log('2. Career Progression:');
    console.log('   Check Q2 to see if Grunzer have realistic paths to advancement\n');
    
    console.log('3. Political Dynamics:');
    console.log('   Review Q3 and Q4 for alliance and conflict frequency\n');
    
    console.log('4. POTENTIAL Impact:');
    console.log('   Q5 shows whether potential ratings meaningfully affect careers\n');
    
    console.log('5. RPG Systems:');
    console.log('   Q6 validates that level and stat progression makes sense\n');
    
    console.log('6. Memorability:');
    console.log('   Q7 identifies if the simulation creates memorable stories\n');

    console.log('\n📋 Next Steps:');
    console.log('   1. Review each section\'s "Balancing Insights"');
    console.log('   2. Implement targeted balance patches based on warnings');
    console.log('   3. Re-run this analysis to validate changes');
    console.log('   4. Document changes in agents.md and features.md');
  }

  /**
   * Main analysis runner
   */
  async analyze() {
    await this.runMultiple();
    
    this.analyzeKingSurvival();
    this.analyzeCareerProgression();
    this.analyzeAlliances();
    this.analyzeClashes();
    this.analyzePotentialInfluence();
    this.analyzeRPGParameters();
    this.analyzeSimulationQuality();
    
    this.generateSummary();
  }
}

// Run the analysis
const analyzer = new SimulationAnalyzer();
analyzer.analyze().catch(console.error);
