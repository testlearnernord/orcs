import type { Officer, WorldState } from '@sim/types';
import { selectWarcallsByStatus, type WarcallWithPhase } from '@state/selectors/warcalls';

const DEFAULT_OFFICER_LIMIT = 20;

export function selectActiveWarcalls(state: WorldState): WarcallWithPhase[] {
  return selectWarcallsByStatus(state, 'active');
}

function sortOfficersByMerit(officers: Officer[]): Officer[] {
  return [...officers].sort(
    (a, b) =>
      b.merit - a.merit ||
      b.level - a.level ||
      a.name.localeCompare(b.name, 'de-DE')
  );
}

export function selectActiveOfficers(
  state: WorldState,
  limit: number = DEFAULT_OFFICER_LIMIT
): Officer[] {
  const alive = state.officers.filter((officer) => officer.status === 'ALIVE');
  if (alive.length === 0) {
    return [];
  }

  const byId = new Map(alive.map((officer) => [officer.id, officer] as const));
  const selected: Officer[] = [];
  const seen = new Set<string>();

  const activeWarcalls = selectActiveWarcalls(state);
  activeWarcalls.forEach((warcall) => {
    const initiator = byId.get(warcall.initiator);
    if (initiator && !seen.has(initiator.id)) {
      selected.push(initiator);
      seen.add(initiator.id);
    }
    warcall.participants.forEach((participantId) => {
      if (seen.has(participantId)) return;
      const participant = byId.get(participantId);
      if (participant) {
        selected.push(participant);
        seen.add(participant.id);
      }
    });
  });

  const king = byId.get(state.kingId);
  if (king && !seen.has(king.id)) {
    selected.push(king);
    seen.add(king.id);
  }

  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  const remainder = sortOfficersByMerit(
    alive.filter((officer) => !seen.has(officer.id))
  );
  for (const officer of remainder) {
    if (selected.length >= limit) break;
    selected.push(officer);
    seen.add(officer.id);
  }

  return selected.slice(0, limit);
}
