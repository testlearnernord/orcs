import { RNG } from '@sim/rng';
import { createGeneralEntry } from '@sim/feed';
import type {
  Officer,
  PotentialRating,
  FeedEntry
} from '@sim/types';

/**
 * Experience and Level-Up System
 * 
 * This module handles officer experience gain and level progression.
 * Officers gain experience from warcalls and other actions, and when they
 * accumulate enough experience, they level up and become stronger.
 * 
 * Level-ups consider officer potential - higher potential officers gain
 * more stats per level.
 */

/**
 * Calculate experience required for a specific level
 * Formula: level^2 * 100
 * This creates an exponential curve for level progression
 */
export function getExpForLevel(level: number): number {
  return level * level * 100;
}

/**
 * Calculate experience gained from merit
 * Merit represents successful actions - we convert 80% of merit to experience
 */
export function calculateExpFromMerit(officer: Officer): number {
  let expFromMerit = Math.floor(officer.merit * 0.8);
  
  // Trait-based experience modifiers
  if (officer.traits.includes('Schlau')) {
    expFromMerit *= 1.25; // +25% exp for smart officers
  }
  if (officer.traits.includes('Dumm')) {
    expFromMerit *= 0.75; // -25% exp for dumb officers
  }
  if (officer.traits.includes('Weise')) {
    expFromMerit *= 1.1; // +10% exp for wise officers
  }
  
  return Math.floor(expFromMerit);
}

/**
 * Calculate total current experience for an officer
 * This includes base experience for their current level plus bonus from merit
 */
export function getCurrentExp(officer: Officer): number {
  const currentLevelExp = getExpForLevel(officer.stats.level);
  const bonusExp = calculateExpFromMerit(officer);
  // Add level-based progression bonus
  const levelBonus = (officer.stats.level - 1) * 150;
  
  return currentLevelExp + bonusExp + levelBonus;
}

/**
 * Get stat increase amount based on potential rating
 * Higher potential officers gain more stats per level
 */
function getStatIncreaseForPotential(potential: PotentialRating): number {
  const increases = {
    'Unbrauchbar': 1,
    'Dumm': 2,
    'Normal': 3,
    'Fähig': 4,
    'Überdurchschnittlich': 5,
    'Genie': 7
  };
  return increases[potential];
}

/**
 * Calculate stat increases for a level-up
 * Returns increases for str, dex, and int based on potential and traits
 */
function calculateStatIncreases(
  officer: Officer,
  rng: RNG
): { str: number; dex: number; int: number; hp: number } {
  const baseIncrease = getStatIncreaseForPotential(officer.stats.potential);
  
  // Additional increase for 'Weise' (wise) trait
  const wiseBonus = officer.traits.includes('Weise') ? 1 : 0;
  
  // Distribute stat points based on archetype and randomness
  let str = 0;
  let dex = 0;
  let int = 0;
  
  const totalPoints = baseIncrease + wiseBonus;
  
  // Determine primary stat based on archetype
  const isArcher = officer.traits.includes('Archer');
  const isTrapper = officer.traits.includes('Trapper');
  const isBerserker = !isArcher && !isTrapper;
  
  // Distribute points with archetype preference
  for (let i = 0; i < totalPoints; i++) {
    const rand = rng.next();
    if (isBerserker) {
      // Berserkers prefer STR (60%), then random
      if (rand < 0.6) str++;
      else if (rand < 0.8) dex++;
      else int++;
    } else if (isArcher) {
      // Archers prefer DEX (60%), then random
      if (rand < 0.6) dex++;
      else if (rand < 0.8) str++;
      else int++;
    } else if (isTrapper) {
      // Trappers prefer INT (60%), then random
      if (rand < 0.6) int++;
      else if (rand < 0.8) dex++;
      else str++;
    }
  }
  
  // HP increases by 10 per level
  const hp = 10;
  
  return { str, dex, int, hp };
}

/**
 * Check if officer should level up and apply the level-up
 * Returns updated officer and optional feed entry
 */
export function processLevelUp(
  officer: Officer,
  rng: RNG,
  cycle: number
): { officer: Officer; feed?: FeedEntry } {
  const currentExp = getCurrentExp(officer);
  const nextLevelExp = getExpForLevel(officer.stats.level + 1);
  
  // Check if officer has enough experience to level up
  if (currentExp < nextLevelExp) {
    return { officer };
  }
  
  // Apply level-up
  const increases = calculateStatIncreases(officer, rng);
  
  const updatedOfficer: Officer = {
    ...officer,
    stats: {
      ...officer.stats,
      level: officer.stats.level + 1,
      str: officer.stats.str + increases.str,
      dex: officer.stats.dex + increases.dex,
      int: officer.stats.int + increases.int,
      maxHp: officer.stats.maxHp + increases.hp,
      hp: Math.min(officer.stats.hp + increases.hp, officer.stats.maxHp + increases.hp)
    }
  };
  
  // Create feed entry for level-up
  const feed = createGeneralEntry(
    rng,
    cycle,
    `${officer.name} erreicht Level ${updatedOfficer.stats.level}! (+${increases.str} STR, +${increases.dex} DEX, +${increases.int} INT, +${increases.hp} HP)`
  );
  
  return { officer: updatedOfficer, feed };
}

/**
 * Process level-ups for all officers in the world
 * Returns updated officers and feed entries
 */
export function processAllLevelUps(
  officers: Officer[],
  rng: RNG,
  cycle: number
): {
  officers: Officer[];
  feed: FeedEntry[];
  levelUps: { officerId: string; oldLevel: number; newLevel: number }[];
} {
  const feed: FeedEntry[] = [];
  const levelUps: { officerId: string; oldLevel: number; newLevel: number }[] = [];
  
  const updatedOfficers = officers.map((officer) => {
    const oldLevel = officer.stats.level;
    const result = processLevelUp(officer, rng, cycle);
    
    if (result.feed) {
      feed.push(result.feed);
      levelUps.push({
        officerId: officer.id,
        oldLevel,
        newLevel: result.officer.stats.level
      });
    }
    
    return result.officer;
  });
  
  return { officers: updatedOfficers, feed, levelUps };
}

/**
 * Rivalry Challenge System
 * Officers with high ambition can challenge their rivals to improve their standing.
 * This gives them additional opportunities to gain merit and experience.
 */

/**
 * Check if officer should challenge a rival
 * Returns true if officer is ambitious enough and has suitable rivals
 */
export function shouldChallengeRival(
  officer: Officer,
  rng: RNG
): boolean {
  // Ambitious goals that lead to challenges
  // Updated to include new rank-appropriate ambitions
  const ambitiousGoals = [
    'stärker werden',
    'König werden',
    'König stürzen',
    'Rivalen töten',
    'Rivalen ausschalten',
    'Captain herausfordern',
    'König herausfordern',
    'sich beweisen',
    'nicht der Schwächste sein'
  ];
  
  const isAmbitious = ambitiousGoals.some(goal => 
    officer.mood.ambition.includes(goal)
  );
  
  if (!isAmbitious) return false;
  
  // Officers with 'Unfreundlich' trait are more likely to challenge
  const challengeChance = officer.traits.includes('Unfreundlich') ? 0.3 : 0.15;
  
  return rng.chance(challengeChance);
}

/**
 * Find best rival to challenge
 * Prefers rivals of similar or slightly higher rank
 */
export function findRivalToChallenge(
  officer: Officer,
  allOfficers: Officer[]
): Officer | undefined {
  const rivals = officer.relationships
    .filter(rel => rel.type === 'RIVAL')
    .map(rel => allOfficers.find(o => o.id === rel.with))
    .filter((o): o is Officer => o !== undefined && o.status === 'ALIVE');
  
  if (rivals.length === 0) return undefined;
  
  // Prefer rivals of equal or higher rank for meaningful challenges
  const rankOrder: Record<Officer['rank'], number> = {
    'Grunzer': 1,
    'Späher': 2,
    'Captain': 3,
    'Spieler': 4,
    'König': 5
  };
  
  const officerRankValue = rankOrder[officer.rank];
  
  // Sort rivals by rank (prefer equal or one rank higher)
  const sortedRivals = rivals.sort((a, b) => {
    const aRankValue = rankOrder[a.rank];
    const bRankValue = rankOrder[b.rank];
    
    // Calculate distance from officer's rank
    const aDist = Math.abs(aRankValue - officerRankValue);
    const bDist = Math.abs(bRankValue - officerRankValue);
    
    // Prefer closer ranks, with slight preference for higher ranks
    if (aDist !== bDist) return aDist - bDist;
    
    // If same distance, prefer higher rank
    return bRankValue - aRankValue;
  });
  
  return sortedRivals[0];
}

/**
 * Process rivalry challenges
 * Officers challenge their rivals, gaining merit and experience
 */
export function processRivalryChallenges(
  officers: Officer[],
  rng: RNG,
  cycle: number
): {
  officers: Officer[];
  feed: FeedEntry[];
  challenges: { challengerId: string; rivalId: string; success: boolean }[];
} {
  const feed: FeedEntry[] = [];
  const challenges: { challengerId: string; rivalId: string; success: boolean }[] = [];
  const updatedOfficers = [...officers];
  
  // Use a forked RNG for rivalry challenges to not affect the main simulation RNG sequence
  const challengeRng = rng.fork(`rivalry-challenges:${cycle}`);
  
  // Track which officers have been involved in challenges this cycle
  const involvedOfficers = new Set<string>();
  
  for (let i = 0; i < officers.length; i++) {
    const officer = updatedOfficers[i];
    
    // Skip if already involved in a challenge or is König
    if (involvedOfficers.has(officer.id) || officer.rank === 'König') {
      continue;
    }
    
    // Check if officer should challenge a rival
    if (!shouldChallengeRival(officer, challengeRng.fork(`check:${officer.id}`))) {
      continue;
    }
    
    // Find a suitable rival
    const rival = findRivalToChallenge(officer, updatedOfficers);
    if (!rival || involvedOfficers.has(rival.id)) {
      continue;
    }
    
    // Calculate challenge success based on levels and stats
    const officerPower = 
      officer.stats.level * 10 +
      officer.stats.str +
      officer.stats.dex +
      officer.stats.int;
    
    const rivalPower =
      rival.stats.level * 10 +
      rival.stats.str +
      rival.stats.dex +
      rival.stats.int;
    
    // Success chance based on relative power
    const powerRatio = officerPower / (officerPower + rivalPower);
    const randomFactor = challengeRng.fork(`outcome:${officer.id}`).next() * 0.3;
    const successChance = powerRatio + randomFactor;
    
    const success = challengeRng.fork(`result:${officer.id}`).chance(successChance);
    
    // Apply merit changes
    const meritGain = success ? 15 : 5; // Even failures give some merit for trying
    const meritLoss = success ? -5 : -2; // Rivals lose less merit
    
    updatedOfficers[i] = {
      ...officer,
      merit: Math.max(0, officer.merit + meritGain)
    };
    
    const rivalIndex = updatedOfficers.findIndex(o => o.id === rival.id);
    if (rivalIndex !== -1) {
      updatedOfficers[rivalIndex] = {
        ...rival,
        merit: Math.max(0, rival.merit + meritLoss)
      };
    }
    
    // Mark both as involved
    involvedOfficers.add(officer.id);
    involvedOfficers.add(rival.id);
    
    // Create feed entry
    const feedText = success
      ? `${officer.name} fordert ${rival.name} heraus und triumphiert! (+${meritGain} Merit)`
      : `${officer.name} fordert ${rival.name} heraus, unterliegt aber. (+${meritGain} Merit für den Versuch)`;
    
    feed.push(createGeneralEntry(challengeRng, cycle, feedText));
    
    challenges.push({
      challengerId: officer.id,
      rivalId: rival.id,
      success
    });
  }
  
  return { officers: updatedOfficers, feed, challenges };
}
