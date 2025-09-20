import type { FeedEntry, Officer, WarcallPlan, WorldState } from '@sim/types';

function cloneFeedEntry(entry: FeedEntry): FeedEntry {
  return { ...entry };
}

function cloneOfficer(officer: Officer): Officer {
  return {
    ...officer,
    traits: [...officer.traits],
    personality: { ...officer.personality },
    relationships: officer.relationships.map((relation) => ({ ...relation })),
    memories: officer.memories.map((memory) => ({ ...memory }))
  };
}

function cloneWarcall(plan: WarcallPlan): WarcallPlan {
  return {
    ...plan,
    participants: [...plan.participants],
    breakdown: plan.breakdown ? { ...plan.breakdown } : undefined
  };
}

export function snapshotWorld(state: WorldState): WorldState {
  return {
    ...state,
    officers: state.officers.map(cloneOfficer),
    graveyard: state.graveyard.map(cloneOfficer),
    warcalls: state.warcalls.map(cloneWarcall),
    feed: state.feed.map(cloneFeedEntry),
    crown: { ...state.crown }
  };
}
