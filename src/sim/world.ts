import { RANK_QUOTAS } from '@sim/constants';
import { addMemory, createOfficer } from '@sim/officerFactory';
import { seedSpawnRelationships } from '@sim/relationships';
import { RNG } from '@sim/rng';
import type { Officer, Rank, WorldState } from '@sim/types';

export function createWorld(
  seed: string,
  rng: RNG = new RNG(seed)
): WorldState {
  const state: WorldState = {
    seed,
    cycle: 0,
    officers: [],
    graveyard: [],
    warcalls: [],
    kingId: '',
    kingStatus: 'GEFESTIGT',
    kingStatusExpires: 0,
    feed: []
  };

  (Object.keys(RANK_QUOTAS) as Rank[]).forEach((rank) => {
    const quota = RANK_QUOTAS[rank];
    for (let i = 0; i < quota; i += 1) {
      let officer = createOfficer(rng, rank, state.cycle);
      officer = addMemory(officer, {
        cycle: 0,
        category: 'SPAWN',
        summary: 'Teil des Ausgangszugs'
      });
      state.officers.push(officer);
      seedSpawnRelationships(state, officer, rng);
    }
  });

  const king = state.officers.find((officer) => officer.rank === 'König');
  if (king) {
    state.kingId = king.id;
  } else if (state.officers.length > 0) {
    state.kingId = state.officers[0].id;
    state.officers[0] = { ...state.officers[0], rank: 'König' } as Officer;
  }

  return state;
}
