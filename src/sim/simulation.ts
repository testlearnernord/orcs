import { OfficerManager } from "./officerManager";
import { RNG } from "./rng";
import { Officer, TimelineEntry, Warcall, WarcallResolution, WorldState } from "./types";
import { computeOfficerPower, totalGroupPower } from "./power";

function sumPower(members: Officer[], rng: RNG): number {
  const base = totalGroupPower(members);
=======
=======
import { TRAIT_COMBAT_MODIFIERS, TRAIT_SYNERGY_BONUS } from "./constants";
import { OfficerManager } from "./officerManager";
import { RNG } from "./rng";
import { Officer, TimelineEntry, Warcall, WarcallResolution, WorldState } from "./types";

function computeOfficerPower(officer: Officer, allies: Officer[]): number {
  let power = 10 + officer.level * 4 + officer.gearScore + officer.merit * 0.15;
  for (const trait of officer.traits) {
    const modifier = TRAIT_COMBAT_MODIFIERS[trait] ?? 1;
    power *= modifier;
    const synergy = TRAIT_SYNERGY_BONUS[trait] ?? 0;
    if (synergy > 0) {
      const shared = allies.filter(ally => ally.traits.includes(trait)).length;
      power *= 1 + shared * synergy;
    }
  }
  if (officer.relationships.bloodOathWith && allies.some(a => a.id === officer.relationships.bloodOathWith)) {
    power *= 1.15;
  }
  const friendCount = allies.filter(a => officer.relationships.friends.includes(a.id)).length;
  power *= 1 + friendCount * 0.05;
  if (officer.relationships.rivals.some(id => allies.some(a => a.id === id))) {
    power *= 0.9;
  }
  power *= 0.95 + officer.personality.aggression * 0.1;
  power *= 0.9 + officer.personality.loyalty * 0.1;
  return power;
}

function sumPower(members: Officer[], rng: RNG): number {
  const allies = members;
  const base = members.reduce((acc, o) => acc + computeOfficerPower(o, allies), 0);
  const randomFactor = 0.9 + rng.next() * 0.2;
  return base * randomFactor;
}

function shouldBetray(rng: RNG, officer: Officer, leader: Officer): boolean {
  let chance = 0.05 + officer.personality.opportunism * 0.25 - officer.personality.loyalty * 0.2;
  if (officer.relationships.rivals.includes(leader.id)) chance += 0.15;
  if (officer.relationships.bloodOathWith === leader.id) chance = 0;
  return chance > 0 && rng.chance(Math.min(0.8, Math.max(0, chance)));
}

function feedEntry(rng: RNG, cycle: number, text: string, tags: string[]): TimelineEntry {
  const id = `feed_${cycle}_${Math.round(rng.next() * 1e9)}`;
  return { id, cycle, text, tags };
}

function safeParticipants(manager: OfficerManager, ids: string[]): Officer[] {
  return ids
    .map(id => manager.getById(id))
    .filter((officer): officer is Officer => Boolean(officer && officer.status === "ALIVE"));
}

function awardParticipants(manager: OfficerManager, participants: Officer[], cycle: number, merit: number, reason: string): void {
  participants.forEach(officer => manager.rewardMerit(officer.id, merit, cycle, reason));
}

function casualty(manager: OfficerManager, officer: Officer, cycle: number) {
  const { casualties, feed } = manager.registerDeath(officer.id, cycle);
  return { casualties, feed };
}

function resolveHunt(
  rng: RNG,
  warcall: Warcall,
  state: WorldState,
  manager: OfficerManager,
  participants: Officer[],
  difficulty: number,
  description: string
): WarcallResolution {
  const feed: TimelineEntry[] = [];
  const power = sumPower(participants, rng);
  if (power >= difficulty) {
    awardParticipants(manager, participants, state.cycle, warcall.rewards.merit, description);
    const entry = feedEntry(rng, state.cycle, `${participants[0].name}s Gruppe triumphiert bei ${warcall.location}`, [warcall.type, "SUCCESS"]);
    feed.push(entry);
    return {
      warcall,
      victorious: participants.map(o => o.id),
      defeated: [],
      betrayals: [],
      casualties: [],
      feedEntries: feed
    };
  }
  const dead = rng.pick(participants);
  const death = casualty(manager, dead, state.cycle);
  feed.push(feedEntry(rng, state.cycle, `${dead.name} kehrt nicht von ${warcall.location} zurück`, [warcall.type, "DEATH"]));
  return {
    warcall,
    victorious: [],
    defeated: [dead.id],
    betrayals: [],
    casualties: death.casualties,
    feedEntries: [...feed, ...death.feed]
  };
}

function resolveAssassination(
  rng: RNG,
  warcall: Warcall,
  state: WorldState,
  manager: OfficerManager,
  participants: Officer[]
): WarcallResolution {
  const feed: TimelineEntry[] = [];
  const assassinRole = warcall.hiddenRoles.find(role => role.role === "ASSASSIN");
  const assassin = assassinRole ? participants.find(o => o.id === assassinRole.who) : participants[0];
  const target = participants.find(o => o.id !== assassin?.id);
  if (!assassin || !target) {
    feed.push(feedEntry(rng, state.cycle, `Attentat ${warcall.id} scheitert mangels Opfer`, ["ASSASSINATION", "ABORTED"]));
    return { warcall, victorious: [], defeated: [], betrayals: [], casualties: [], feedEntries: feed };
  }
  const assassinPower = computeOfficerPower(assassin, [assassin]);
  const targetPower = computeOfficerPower(target, [target]);
  const swing = (rng.next() - 0.5) * 4;
  if (assassinPower + swing > targetPower) {
    const death = casualty(manager, target, state.cycle);
    manager.rewardMerit(assassin.id, warcall.rewards.merit, state.cycle, "Gelungenes Attentat");
    feed.push(feedEntry(rng, state.cycle, `${assassin.name} meuchelt ${target.name} in ${warcall.location}`, ["ASSASSINATION", "SUCCESS"]));
    return {
      warcall,
      victorious: [assassin.id],
      defeated: [target.id],
      betrayals: [],
      casualties: death.casualties,
      feedEntries: [...feed, ...death.feed]
    };
  }
  if (rng.chance(0.5)) {
    const death = casualty(manager, assassin, state.cycle);
    feed.push(feedEntry(rng, state.cycle, `${assassin.name} stirbt beim gescheiterten Attentat auf ${target.name}`, ["ASSASSINATION", "DEATH"]));
    return { warcall, victorious: [target.id], defeated: [assassin.id], betrayals: [], casualties: death.casualties, feedEntries: [...feed, ...death.feed] };
  }
  feed.push(feedEntry(rng, state.cycle, `${target.name} wehrt ${assassin.name}s Angriff ab`, ["ASSASSINATION", "FAIL"]));
  return { warcall, victorious: [target.id], defeated: [], betrayals: [], casualties: [], feedEntries: feed };
}

function resolveOverfall(
  rng: RNG,
  warcall: Warcall,
  state: WorldState,
  manager: OfficerManager,
  participants: Officer[]
): WarcallResolution {
  const feed: TimelineEntry[] = [];
  const initiator = participants.find(o => o.id === warcall.initiator);
  if (!initiator) {
    feed.push(feedEntry(rng, state.cycle, `Überfall ${warcall.id} scheitert ohne Initiator`, ["OVERFALL", "ABORTED"]));
    return { warcall, victorious: [], defeated: [], betrayals: [], casualties: [], feedEntries: feed };
  }
  const others = participants.filter(o => o.id !== initiator.id);
  if (others.length === 0) {
    feed.push(feedEntry(rng, state.cycle, `${initiator.name} findet keine Gegner für den Überfall`, ["OVERFALL", "ABORTED"]));
    return { warcall, victorious: [], defeated: [], betrayals: [], casualties: [], feedEntries: feed };
  }
  const splitIndex = Math.max(1, Math.floor(others.length / 2));
  const attackers = [initiator, ...others.slice(0, splitIndex)];
  const defenders = others.slice(splitIndex);
  if (defenders.length === 0) {
    feed.push(feedEntry(rng, state.cycle, `${initiator.name} vertreibt Plünderer ohne Widerstand`, ["OVERFALL", "NO_DEF"]));
    awardParticipants(manager, attackers, state.cycle, Math.round(warcall.rewards.merit / 2), "Leichter Überfall");
    return { warcall, victorious: attackers.map(o => o.id), defeated: [], betrayals: [], casualties: [], feedEntries: feed };
  }
  const betrayalIds: string[] = [];
  for (const member of attackers.slice(1)) {
    if (shouldBetray(rng, member, initiator)) {
      defenders.push(member);
      attackers.splice(attackers.indexOf(member), 1);
      betrayalIds.push(member.id);
    }
  }
  const attackPower = sumPower(attackers, rng);
  const defensePower = sumPower(defenders, rng);
  const attackWins = attackPower >= defensePower;
  const defeatedSide = attackWins ? defenders : attackers;
  const winningSide = attackWins ? attackers : defenders;
  awardParticipants(manager, winningSide, state.cycle, warcall.rewards.merit, "Überfall-Erfolg");
  const victim = rng.pick(defeatedSide);
  const death = casualty(manager, victim, state.cycle);
  feed.push(feedEntry(rng, state.cycle, `${winningSide[0].name}s Seite siegt bei ${warcall.location}`, ["OVERFALL", attackWins ? "SUCCESS" : "FAIL"]));
  return {
    warcall,
    victorious: winningSide.map(o => o.id),
    defeated: defeatedSide.map(o => o.id),
    betrayals: betrayalIds,
    casualties: death.casualties,
    feedEntries: [...feed, ...death.feed]
  };
}

function resolvePurge(
  rng: RNG,
  warcall: Warcall,
  state: WorldState,
  manager: OfficerManager,
  participants: Officer[]
): WarcallResolution {
  const feed: TimelineEntry[] = [];
  const initiator = participants.find(o => o.id === warcall.initiator);
  if (!initiator) {
    feed.push(feedEntry(rng, state.cycle, `Säuberung ${warcall.id} scheitert ohne König`, ["PURGE", "ABORTED"]));
    return { warcall, victorious: [], defeated: [], betrayals: [], casualties: [], feedEntries: feed };
  }
  const loyalists = participants.filter(o => o.id === initiator.id || warcall.hiddenRoles.some(role => role.who === o.id && role.role === "LOYALIST"));
  const suspects = participants.filter(o => !loyalists.includes(o));
  if (suspects.length === 0) {
    feed.push(feedEntry(rng, state.cycle, `${initiator.name} erzwingt neue Treueschwüre`, ["PURGE", "LOYALTY"]));
    awardParticipants(manager, loyalists, state.cycle, Math.round(warcall.rewards.merit / 2), "Treueeid");
    return { warcall, victorious: loyalists.map(o => o.id), defeated: [], betrayals: [], casualties: [], feedEntries: feed };
  }
  const fleeing = suspects.filter(s => rng.chance(0.4));
  const fighters = suspects.filter(s => !fleeing.includes(s));
  const betrayalIds = fighters.map(o => o.id);
  if (fighters.length === 0) {
    feed.push(feedEntry(rng, state.cycle, `${initiator.name} erklärt ${fleeing.length} Offiziere zu Vogelfreien`, ["PURGE", "EXILE"]));
    return { warcall, victorious: loyalists.map(o => o.id), defeated: fleeing.map(o => o.id), betrayals: betrayalIds, casualties: [], feedEntries: feed };
  }
  const loyalPower = sumPower(loyalists, rng);
  const rebelPower = sumPower(fighters, rng);
  const loyalWin = loyalPower >= rebelPower;
  const loser = loyalWin ? fighters : loyalists;
  const winner = loyalWin ? loyalists : fighters;
  const victim = rng.pick(loser);
  const death = casualty(manager, victim, state.cycle);
  feed.push(feedEntry(rng, state.cycle, `${winner[0].name} entscheidet die Säuberung`, ["PURGE", loyalWin ? "SUCCESS" : "REBELLION"]));
  return {
    warcall,
    victorious: winner.map(o => o.id),
    defeated: loser.map(o => o.id),
    betrayals: betrayalIds,
    casualties: death.casualties,
    feedEntries: [...feed, ...death.feed]
  };
}

function resolveFeast(
  rng: RNG,
  warcall: Warcall,
  state: WorldState,
  manager: OfficerManager,
  participants: Officer[]
): WarcallResolution {
  const feed: TimelineEntry[] = [];
  participants.forEach(officer => manager.rewardMerit(officer.id, Math.round(warcall.rewards.merit / 2), state.cycle, "Feast-Bindung"));
  const entry = feedEntry(rng, state.cycle, `${participants[0].name} richtet ein heikles Festmahl in ${warcall.location}`,["FEAST", "BOND"]);
  feed.push(entry);
  if (participants.length > 1 && rng.chance(0.15)) {
    const betrayer = rng.pick(participants.slice(1));
    const victim = rng.pick(participants.filter(o => o.id !== betrayer.id));
    const death = casualty(manager, victim, state.cycle);
    feed.push(feedEntry(rng, state.cycle, `${betrayer.name} vergiftet ${victim.name} beim Fest`, ["FEAST", "BETRAYAL"]));
    return { warcall, victorious: [betrayer.id], defeated: [victim.id], betrayals: [betrayer.id], casualties: death.casualties, feedEntries: [...feed, ...death.feed] };
  }
  return { warcall, victorious: participants.map(o => o.id), defeated: [], betrayals: [], casualties: [], feedEntries: feed };
}

/**
 * Simuliert einen Warcall und gibt das Resultat zurück.
 *
 * @example
 * const result = resolveWarcallCombat(rng, warcall, state, manager);
 */
export function resolveWarcallCombat(
  rng: RNG,
  warcall: Warcall,
  state: WorldState,
  manager: OfficerManager
): WarcallResolution {
  const participants = safeParticipants(manager, warcall.participants);
  if (participants.length === 0) {
    return { warcall, victorious: [], defeated: [], betrayals: [], casualties: [], feedEntries: [feedEntry(rng, state.cycle, `Warcall ${warcall.id} entfällt mangels Teilnehmer`, ["EMPTY"])] };
  }
  switch (warcall.type) {
    case "HUNT":
      return resolveHunt(rng, warcall, state, manager, participants, 16, "Erfolgreiche Jagd");
    case "MONSTER_HUNT":
      return resolveHunt(rng, warcall, state, manager, participants, 26, "Monster bezwungen");
    case "ASSASSINATION":
      return resolveAssassination(rng, warcall, state, manager, participants);
    case "OVERFALL":
      return resolveOverfall(rng, warcall, state, manager, participants);
    case "PURGE":
      return resolvePurge(rng, warcall, state, manager, participants);
    case "FEAST":
    default:
      return resolveFeast(rng, warcall, state, manager, participants);
  }
}
