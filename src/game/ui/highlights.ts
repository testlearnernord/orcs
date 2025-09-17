import type { CycleSummary } from "@sim/types";

/**
 * Ermittelt die Offiziere, die im letzten Cycle besondere Aufmerksamkeit
 * erhalten sollen.
 *
 * @example
 * const ids = collectHighlightIds(summary);
 * ids.has(officerId);
 */
export function collectHighlightIds(summary?: CycleSummary): Set<string> {
  const ids = new Set<string>();
  if (!summary) return ids;

  summary.newWarcalls.forEach(warcall => {
    ids.add(warcall.initiator);
    warcall.participants.forEach(participant => ids.add(participant));
    warcall.hiddenRoles.forEach(role => ids.add(role.who));
  });

  summary.resolved.forEach(resolution => {
    const { warcall } = resolution;
    ids.add(warcall.initiator);
    warcall.participants.forEach(participant => ids.add(participant));
    resolution.victorious.forEach(id => ids.add(id));
    resolution.defeated.forEach(id => ids.add(id));
    resolution.casualties.forEach(casualty => ids.add(casualty.officerId));
  });

  summary.replacements.forEach(recruit => ids.add(recruit.id));

  return ids;
}
