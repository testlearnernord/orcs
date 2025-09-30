import { describe, expect, it } from 'vitest';
import { OfficerCard } from '@ui/components/officerCard';
import type { Officer, Rank } from '@sim/types';

function createOfficer(rank: Rank, traits: string[] = []): Officer {
  return {
    id: `officer-${rank}`,
    stableId: `officer-${rank}`,
    name: `Test ${rank}`,
    rank,
    merit: 100,
    traits,
    personality: { gier: 50, tapferkeit: 50, loyalitaet: 50, stolz: 50 },
    relationships: [],
    status: 'ACTIVE',
    cycleJoined: 1,
    cycleDied: null,
    memories: [],
    stats: {
      level: 5,
      str: 50,
      dex: 50,
      int: 50,
      hp: 100,
      maxHp: 100
    },
    mood: {
      morale: 50,
      loyalty: 50
    }
  };
}

describe('OfficerCard - Uniform Design', () => {
  const ranks: Rank[] = ['König', 'Captain', 'Späher', 'Grunzer'];

  it('creates cards for all ranks using the same component', () => {
    ranks.forEach((rank) => {
      const officer = createOfficer(rank);
      const card = new OfficerCard(officer, {});

      expect(card.element).toBeDefined();
      expect(card.element.tagName).toBe('ARTICLE');
      expect(card.element.classList.contains('officer-card')).toBe(true);
      expect(card.element.dataset.rank).toBeDefined();
    });
  });

  it('includes EXP bar for all ranks', () => {
    ranks.forEach((rank) => {
      const officer = createOfficer(rank);
      const card = new OfficerCard(officer, {});

      // Find all stat rows
      const stats = card.element.querySelectorAll('.officer-card__stat');

      // Should have 5 stats: STR, DEX, INT, HP, EXP
      expect(stats.length).toBe(5);

      // The 5th stat (index 4) should be EXP
      const expStat = stats[4];
      const label = expStat.querySelector('.officer-card__stat-label');
      expect(label?.textContent).toBe('Erfahrung');

      // Should have an animated bar
      const bar = expStat.querySelector('.officer-card__stat-bar');
      expect(bar).toBeDefined();
      const fill = bar?.querySelector('.officer-card__stat-fill');
      expect(fill).toBeDefined();
    });
  });

  it('includes trait container for all ranks', () => {
    ranks.forEach((rank) => {
      const officer = createOfficer(rank, ['Schlau', 'Freundlich']);
      const card = new OfficerCard(officer, {});

      const traitContainer = card.element.querySelector(
        '.officer-card__traits'
      );
      expect(traitContainer).toBeDefined();

      // Should have trait chips
      const traits = traitContainer?.querySelectorAll('.officer-card__trait');
      expect(traits?.length).toBeGreaterThan(0);
    });
  });

  it('includes level badge for all ranks', () => {
    ranks.forEach((rank) => {
      const officer = createOfficer(rank);
      const card = new OfficerCard(officer, {});

      const levelBadge = card.element.querySelector('.officer-card__level');
      expect(levelBadge).toBeDefined();
      expect(levelBadge?.textContent).toContain('Lv. 5');
    });
  });

  it('includes merit badge for all ranks', () => {
    ranks.forEach((rank) => {
      const officer = createOfficer(rank);
      const card = new OfficerCard(officer, {});

      const meritBadge = card.element.querySelector('.officer-card__badge');
      expect(meritBadge).toBeDefined();
      expect(meritBadge?.textContent).toContain('Merit');
    });
  });

  it('sets correct data-rank attribute for each rank', () => {
    const expectedSlugs: Record<Rank, string> = {
      König: 'king',
      Spieler: 'player',
      Captain: 'captain',
      Späher: 'scout',
      Grunzer: 'grunt'
    };

    ranks.forEach((rank) => {
      const officer = createOfficer(rank);
      const card = new OfficerCard(officer, {});

      expect(card.element.dataset.rank).toBe(expectedSlugs[rank]);
    });
  });
});
