import { PROMOTION_THRESHOLDS } from "./constants";
import { OfficerManager } from "./officerManager";
import { RNG } from "./rng";
import { pushMemory } from "./officer";
import { planWarcalls, resolveDueWarcalls } from "./warcall";
import { CycleSummary, CycleTrigger, HierarchyChange, Rank, TimelineEntry, WarcallResolution, WorldState } from "./types";

const RANK_ORDER: Rank[] = ["Grunzer", "Späher", "Captain", "Anführer", "Herausforderer", "König"];

function nextRank(rank: Rank): Rank | null {
  const index = RANK_ORDER.indexOf(rank);
  if (index === -1 || index >= RANK_ORDER.length - 1) return null;
  return RANK_ORDER[index + 1];
}

function previousRank(rank: Rank): Rank | null {
  const index = RANK_ORDER.indexOf(rank);
  if (index <= 0) return null;
  return RANK_ORDER[index - 1];
}

function createEntry(rng: RNG, cycle: number, text: string, tags: string[]): TimelineEntry {
  return { id: `cycle_${cycle}_${Math.round(rng.next() * 1e9)}`, cycle, text, tags };
}

function applyHierarchy(rng: RNG, state: WorldState): { changes: HierarchyChange[]; feed: TimelineEntry[] } {
  const changes: HierarchyChange[] = [];
  const feed: TimelineEntry[] = [];
  state.officers = state.officers.map(officer => {
    if (officer.status !== "ALIVE") return officer;
    const thresholds = PROMOTION_THRESHOLDS[officer.rank];
    const promotionTarget = thresholds.promoteAtMerit !== null && officer.merit >= thresholds.promoteAtMerit ? nextRank(officer.rank) : null;
    if (promotionTarget) {
      changes.push({ officerId: officer.id, from: officer.rank, to: promotionTarget });
      feed.push(createEntry(rng, state.cycle, `${officer.name} steigt zum ${promotionTarget} auf`, ["PROMOTION"]));
      const promoted = pushMemory({ ...officer, rank: promotionTarget }, { cycle: state.cycle, type: "PROMOTION", notes: `Aufstieg zu ${promotionTarget}` });
      return promoted;
    }
    const demotionTarget = thresholds.demoteBelowMerit !== null && officer.merit < thresholds.demoteBelowMerit ? previousRank(officer.rank) : null;
    if (demotionTarget) {
      changes.push({ officerId: officer.id, from: officer.rank, to: demotionTarget });
      feed.push(createEntry(rng, state.cycle, `${officer.name} fällt zum ${demotionTarget} zurück`, ["DEMOTION"]));
      const demoted = pushMemory({ ...officer, rank: demotionTarget }, { cycle: state.cycle, type: "DEMOTION", notes: `Rückstufung zu ${demotionTarget}` });
      return demoted;
    }
    return officer;
  });
  return { changes, feed };
}

function summarizeResolutions(resolutions: WarcallResolution[]): TimelineEntry[] {
  return resolutions.flatMap(resolution => resolution.feedEntries);
}

/**
 * Führt einen Cycle zu Ende und liefert die wichtigsten Änderungen.
 *
 * @example
 * const summary = runCycle(rng, worldState, "DEBUG");
 */
export function runCycle(rng: RNG, state: WorldState, trigger: CycleTrigger = "DEBUG"): CycleSummary {
  const manager = new OfficerManager(rng, state);
  const prevAlive = manager.getAlive().length;
  state.cycle += 1;

  const resolved = resolveDueWarcalls(rng, state, manager);
  const hierarchy = applyHierarchy(rng, state);
  const recruits = manager.ensureRoster(state.cycle);
  const newWarcalls = planWarcalls(rng, state);

  const feed: TimelineEntry[] = [];
  feed.push(...summarizeResolutions(resolved));
  feed.push(...hierarchy.feed);
  recruits.forEach(officer => {
    feed.push(createEntry(rng, state.cycle, `${officer.name} tritt als Rekrut bei`, ["RECRUIT"]));
  });
  newWarcalls.forEach(warcall => {
    feed.push(createEntry(rng, state.cycle, `Neuer Warcall ${warcall.type} bei ${warcall.location}`, ["WARCALL", "NEW"]));
  });

  state.feed = [...state.feed, ...feed].slice(-60);

  const deathTrigger = manager.detectCycleTrigger(prevAlive);
  const resultingTrigger = deathTrigger ?? trigger;

  return {
    cycle: state.cycle,
    trigger: resultingTrigger,
    newWarcalls,
    resolved,
    hierarchyChanges: hierarchy.changes,
    replacements: recruits,
    feed
  };
}
