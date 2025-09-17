import type { Officer, Warcall, WarcallType } from "@sim/types";

export const WARCALL_TYPE_ICONS: Record<WarcallType, string> = {
  FEAST: "🍖",
  OVERFALL: "⚔️",
  ASSASSINATION: "🗡️",
  HUNT: "🏹",
  MONSTER_HUNT: "🐉",
  PURGE: "🔥"
};

export const WARCALL_TYPE_LABELS: Record<WarcallType, string> = {
  FEAST: "Festmahl",
  OVERFALL: "Überfall",
  ASSASSINATION: "Attentat",
  HUNT: "Jagd",
  MONSTER_HUNT: "Monsterjagd",
  PURGE: "Säuberung"
};

export const WARCALL_TYPE_GOALS: Record<WarcallType, string> = {
  FEAST: "Bindungen stärken",
  OVERFALL: "Beute sichern",
  ASSASSINATION: "Ziel ausschalten",
  HUNT: "Trophäe erlegen",
  MONSTER_HUNT: "Bestie besiegen",
  PURGE: "Rivalen säubern"
};

function isFriend(initiator: Officer | undefined, officer: Officer): boolean {
  if (!initiator) return false;
  return (
    initiator.relationships.friends.includes(officer.id) ||
    officer.relationships.friends.includes(initiator.id)
  );
}

function isRival(initiator: Officer | undefined, officer: Officer): boolean {
  if (!initiator) return false;
  return (
    initiator.relationships.rivals.includes(officer.id) ||
    officer.relationships.rivals.includes(initiator.id)
  );
}

/**
 * Liefert eine textuelle Rollenbeschreibung für einen Teilnehmer eines Warcalls.
 *
 * @example
 * const role = resolveParticipantRole(warcall, officer, initiator);
 */
export function resolveParticipantRole(
  warcall: Warcall,
  officer: Officer,
  initiator?: Officer
): string {
  if (warcall.initiator === officer.id) {
    return "Ausrufer";
  }

  const hidden = warcall.hiddenRoles.find(role => role.who === officer.id);
  if (hidden) {
    switch (hidden.role) {
      case "ASSASSIN":
        return "Assassine";
      case "TRAITOR":
        return "Rivale (verdeckt)";
      case "LOYALIST":
        return "Loyalist";
      default:
        break;
    }
  }

  if (isRival(initiator, officer)) {
    return "Rivale";
  }
  if (isFriend(initiator, officer)) {
    return "Verbündeter";
  }
  return "Supporter";
}

/**
 * Erstellt einen kurzen Aktivitäts-String für eine laufende Mission.
 *
 * @example
 * const text = formatWarcallActivity(type, location, role);
 */
export function formatWarcallActivity(type: WarcallType, location: string, role: string): string {
  const label = WARCALL_TYPE_LABELS[type];
  return `${label} @ ${location} (${role})`;
}
