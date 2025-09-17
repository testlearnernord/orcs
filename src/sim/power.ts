import { TRAIT_COMBAT_MODIFIERS, TRAIT_SYNERGY_BONUS } from "./constants";
import type { Officer } from "./types";

function sharedTraitCount(officer: Officer, allies: Officer[], trait: Officer["traits"][number]): number {
  return allies.filter(ally => ally.id !== officer.id && ally.traits.includes(trait)).length;
}

/**
 * Berechnet die Kampfkraft eines Offiziers im Kontext seiner Verbündeten.
 *
 * @example
 * const power = computeOfficerPower(officer, allies);
 */
export function computeOfficerPower(officer: Officer, allies: Officer[]): number {
  let power = 10 + officer.level * 4 + officer.gearScore + officer.merit * 0.15;
  for (const trait of officer.traits) {
    const modifier = TRAIT_COMBAT_MODIFIERS[trait] ?? 1;
    power *= modifier;

    const synergy = TRAIT_SYNERGY_BONUS[trait] ?? 0;
    if (synergy > 0) {
      const shared = sharedTraitCount(officer, allies, trait);
      power *= 1 + shared * synergy;
    }
  }

  if (officer.relationships.bloodOathWith && allies.some(a => a.id === officer.relationships.bloodOathWith)) {
    power *= 1.15;
  }

  const friendCount = allies.filter(a => officer.relationships.friends.includes(a.id)).length;
  if (friendCount > 0) {
    power *= 1 + friendCount * 0.05;
  }

  if (officer.relationships.rivals.some(id => allies.some(a => a.id === id))) {
    power *= 0.9;
  }

  power *= 0.95 + officer.personality.aggression * 0.1;
  power *= 0.9 + officer.personality.loyalty * 0.1;

  return power;
}

/**
 * Summiert die Kampfkraft einer Gruppe deterministisch ohne Zufallsfaktoren.
 *
 * @example
 * const total = totalGroupPower(members);
 */
export function totalGroupPower(members: Officer[]): number {
  if (members.length === 0) return 0;
  return members.reduce((acc, officer) => acc + computeOfficerPower(officer, members), 0);
}
