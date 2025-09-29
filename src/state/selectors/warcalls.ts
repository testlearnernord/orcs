import type { WarcallPhase, WarcallPlan, WorldState } from '@sim/types';

export type Phase = WarcallPhase;
export type Status = 'active' | 'pending' | 'done';

export interface WarcallWithPhase extends WarcallPlan {
  phase: Phase;
}

export function phaseOf(plan: WarcallPlan, currentCycle: number): Phase {
  // Simplified to only START and ENDE phases
  if (plan.resolveOn <= currentCycle) return 'ENDE';
  return 'START';
}

export function statusOf(warcall: {
  phase: Phase;
  participants?: string[];
}): Status {
  // Simplified logic for START/ENDE phases
  if (warcall.phase === 'ENDE') return 'done';
  if (
    warcall.phase === 'START' &&
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
