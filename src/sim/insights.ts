import { totalGroupPower, computeOfficerPower } from "./power";
import type { Officer, Warcall, WorldState } from "./types";

function aliveParticipants(state: WorldState, warcall: Warcall): Officer[] {
  const ids = warcall.participants.includes(warcall.initiator)
    ? warcall.participants
    : [warcall.initiator, ...warcall.participants];
  return ids
    .map(id => state.officers.find(officer => officer.id === id && officer.status === "ALIVE"))
    .filter((officer): officer is Officer => Boolean(officer));
}

function lookupOfficer(state: WorldState, id: string): Officer | undefined {
  return state.officers.find(officer => officer.id === id);
}

function clampChance(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  if (!Number.isFinite(value)) return value > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, value));
}

function logisticRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return numerator > 0 ? 1 : 0;
  return clampChance(numerator / (numerator + denominator));
}

function huntDifficulty(type: Warcall["type"]): number {
  return type === "MONSTER_HUNT" ? 26 : 16;
}

function estimateAssassination(state: WorldState, warcall: Warcall, participants: Officer[]): number {
  const assassinRole = warcall.hiddenRoles.find(role => role.role === "ASSASSIN");
  const assassin = assassinRole
    ? participants.find(officer => officer.id === assassinRole.who)
    : participants[0];
  const targets = participants.filter(officer => officer.id !== assassin?.id);
  const target = targets.sort((a, b) => b.level - a.level)[0];
  if (!assassin || !target) return 0.5;
  const assassinPower = computeOfficerPower(assassin, [assassin]);
  const targetPower = computeOfficerPower(target, [target]);
  return clampChance(assassinPower / (targetPower * 1.15));
}

function betrayalRisk(participant: Officer, leader: Officer): number {
  let chance = 0.05 + participant.personality.opportunism * 0.25 - participant.personality.loyalty * 0.2;
  if (participant.relationships.rivals.includes(leader.id)) chance += 0.15;
  if (participant.relationships.bloodOathWith === leader.id) chance = 0;
  return clampChance(chance);
}

function estimateOverfall(_state: WorldState, warcall: Warcall, participants: Officer[]): number {
  const initiator = participants.find(officer => officer.id === warcall.initiator);
  if (!initiator) return 0.5;
  const others = participants.filter(officer => officer.id !== initiator.id);
  if (others.length === 0) return 0.8;

  const splitIndex = Math.max(1, Math.floor(others.length / 2));
  const attackers = [initiator, ...others.slice(0, splitIndex)];
  const defenders = others.slice(splitIndex);
  if (defenders.length === 0) return 0.9;

  const betrayalPenalty = attackers
    .slice(1)
    .reduce((acc, officer) => acc + betrayalRisk(officer, initiator), 0);
  const attackPower = totalGroupPower(attackers) * (1 - betrayalPenalty * 0.2);
  const defensePower = totalGroupPower(defenders);
  return logisticRatio(attackPower, defensePower);
}

function estimateHunt(warcall: Warcall, participants: Officer[]): number {
  const base = totalGroupPower(participants);
  const required = huntDifficulty(warcall.type) * participants.length;
  return clampChance(base / (required * 1.1));
}

function estimatePurge(state: WorldState, warcall: Warcall, participants: Officer[]): number {
  const initiator = participants.find(officer => officer.id === warcall.initiator);
  if (!initiator) return 0.5;
  const loyalists = participants.filter(officer =>
    officer.id === initiator.id || warcall.hiddenRoles.some(role => role.who === officer.id && role.role === "LOYALIST")
  );
  const suspects = participants.filter(officer => !loyalists.includes(officer));
  if (suspects.length === 0) return 0.85;
  const loyalPower = totalGroupPower(loyalists);
  const suspectPower = totalGroupPower(suspects);
  const base = logisticRatio(loyalPower, suspectPower);
  // Fliehende reduzieren den Erfolg leicht.
  const fleePenalty = suspects.length * 0.05;
  return clampChance(base * (1 - fleePenalty) + 0.1);
}

function estimateFeast(participants: Officer[]): number {
  if (participants.length <= 1) return 0.95;
  const betrayalChances = participants.slice(1).map(officer => 0.15);
  const betrayalRiskTotal = betrayalChances.reduce((acc, value) => acc + value, 0);
  return clampChance(0.95 - betrayalRiskTotal * 0.1);
}

function estimateGeneric(state: WorldState, warcall: Warcall, participants: Officer[]): number {
  switch (warcall.type) {
    case "ASSASSINATION":
      return estimateAssassination(state, warcall, participants);
    case "OVERFALL":
      return estimateOverfall(state, warcall, participants);
    case "PURGE":
      return estimatePurge(state, warcall, participants);
    case "HUNT":
    case "MONSTER_HUNT":
      return estimateHunt(warcall, participants);
    case "FEAST":
    default:
      return estimateFeast(participants);
  }
}

/**
 * Schätzt die Erfolgschance eines Warcalls aus Sicht des Initiators (0-1).
 *
 * @example
 * const chance = estimateWarcallSuccess(state, warcall);
 */
export function estimateWarcallSuccess(state: WorldState, warcall: Warcall): number {
  const participants = aliveParticipants(state, warcall);
  if (participants.length === 0) return 0.5;
  const initiator = lookupOfficer(state, warcall.initiator);
  if (!initiator || initiator.status !== "ALIVE") return 0.5;

  return clampChance(estimateGeneric(state, warcall, participants));
}
