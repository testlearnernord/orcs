import { describe, it } from 'vitest';
import { createWorld } from '@sim/world';
import { advanceCycle } from '@sim/cycle';
import { RNG } from '@sim/rng';

describe('Long-term simulation with authentic progression', () => {
  it('should demonstrate authentic merit-based progression over 50 cycles', () => {
    const seed = 'long-term-authentic';
    const rng = new RNG(seed);
    const state = createWorld(seed, rng);

    console.log('\n=== Long-term Simulation (50 cycles) ===');
    console.log('This demonstrates how officers must earn their way up the ranks\n');

    let totalPromotions = 0;
    let promotionsByRank: Record<string, number> = {};
    let firstGrunzerToSpäher = -1;
    let firstSpäherToCaptain = -1;

    for (let i = 0; i < 50; i++) {
      const summary = advanceCycle(state, rng);

      if (summary.promotions.length > 0) {
        totalPromotions += summary.promotions.length;
        
        summary.promotions.forEach((p) => {
          const key = `${p.from} → ${p.to}`;
          promotionsByRank[key] = (promotionsByRank[key] || 0) + 1;
          
          const officer = state.officers.find((o) => o.id === p.officerId);
          console.log(
            `Cycle ${summary.cycle}: ${officer?.name || p.officerId} promoted ${p.from} → ${p.to} (Merit: ${officer?.merit || '?'})`
          );

          if (p.from === 'Grunzer' && p.to === 'Späher' && firstGrunzerToSpäher === -1) {
            firstGrunzerToSpäher = summary.cycle;
          }
          if (p.from === 'Späher' && p.to === 'Captain' && firstSpäherToCaptain === -1) {
            firstSpäherToCaptain = summary.cycle;
          }
        });
      }
    }

    console.log('\n=== Final Statistics ===');
    console.log(`Total promotions over 50 cycles: ${totalPromotions}`);
    console.log('Promotions by type:');
    Object.entries(promotionsByRank).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
    
    if (firstGrunzerToSpäher !== -1) {
      console.log(`\nFirst Grunzer → Späher promotion: Cycle ${firstGrunzerToSpäher}`);
    } else {
      console.log('\nNo Grunzer reached Späher rank (requires 500 Merit)');
    }
    
    if (firstSpäherToCaptain !== -1) {
      console.log(`First Späher → Captain promotion: Cycle ${firstSpäherToCaptain}`);
    } else {
      console.log('No Späher reached Captain rank (requires 1000 Merit)');
    }

    const finalRanks = state.officers.reduce((acc, o) => {
      acc[o.rank] = (acc[o.rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('\nFinal rank distribution:', finalRanks);

    // Show merit distribution by rank
    const meritByRank: Record<string, number[]> = {};
    state.officers.forEach((o) => {
      if (!meritByRank[o.rank]) meritByRank[o.rank] = [];
      meritByRank[o.rank].push(o.merit);
    });

    console.log('\nMerit ranges by rank:');
    Object.entries(meritByRank).forEach(([rank, merits]) => {
      const min = Math.min(...merits);
      const max = Math.max(...merits);
      const avg = merits.reduce((sum, m) => sum + m, 0) / merits.length;
      console.log(`  ${rank}: ${min.toFixed(0)} - ${max.toFixed(0)} (avg: ${avg.toFixed(0)})`);
    });

    console.log('\n=== Analysis ===');
    console.log('With the new thresholds:');
    console.log('- Grunzer must earn 500 Merit to become Späher (significant achievement)');
    console.log('- Späher must earn 1000 Merit to become Captain (elite status)');
    console.log('- This creates authentic progression where rank truly means something');
    console.log('- Officers start weak but can prove themselves over time');
  });
});
