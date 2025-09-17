import type { Officer, Warcall } from "@sim/types";
import { formatWarcallActivity, resolveParticipantRole } from "./warcallUi";

export interface OfficerActivity {
  summary: string;
  warcallId?: string;
  role?: string;
}

function isActiveWarcall(officer: Officer, warcall: Warcall): boolean {
  if (warcall.state === "RESOLVED") return false;
  if (warcall.initiator === officer.id) return true;
  return warcall.participants.includes(officer.id);
}

/**
 * Beschreibt die aktuelle Tätigkeit eines Offiziers anhand aktiver Warcalls.
 *
 * @example
 * const activity = describeOfficerActivity(officer, warcalls, lookup);
 */
export function describeOfficerActivity(
  officer: Officer,
  warcalls: Warcall[],
  lookup: (id: string) => Officer | undefined
): OfficerActivity {
  const active = warcalls.find(warcall => isActiveWarcall(officer, warcall));
  if (!active) {
    return { summary: "Freies Spiel" };
  }

  const initiator = lookup(active.initiator);
  const role = resolveParticipantRole(active, officer, initiator);
  return {
    summary: formatWarcallActivity(active.type, active.location, role),
    warcallId: active.id,
    role
  };
}
