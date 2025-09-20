import type { WarcallPhase, WarcallPlan, WorldState } from '@sim/types';

export type Phase = WarcallPhase;
export type Status = 'active' | 'pending' | 'done';

export interface WarcallWithPhase extends WarcallPlan {
  phase: Phase;
}

export function phaseOf(plan: WarcallPlan, currentCycle: number): Phase {
  if (plan.resolveOn <= currentCycle) return 'event';
  const remaining = plan.resolveOn - currentCycle;
  if (remaining === 1) return 'travel';
  return 'prep';
}

export function statusOf(warcall: {
  phase: Phase;
  participants?: string[];
}): Status {
  if (warcall.phase === 'resolution') return 'done';
  if (
    warcall.phase === 'prep' &&
    (!warcall.participants || warcall.participants.length === 0)
  ) {
    return 'pending';
  }
  return 'active';
}

export function withPhase(
  plan: WarcallPlan,
  currentCycle: number
): WarcallWithPhase {
  return {
    ...plan,
    participants: [...plan.participants],
    phase: phaseOf(plan, currentCycle)
  };
}

export function selectWarcallsByStatus(
  state: WorldState,
  status: Status
): WarcallWithPhase[] {
  return state.warcalls
    .map((plan) => withPhase(plan, state.cycle))
    .filter((warcall) => statusOf(warcall) === status);
}
