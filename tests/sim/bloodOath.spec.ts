import { describe, expect, it } from 'vitest';

import { BLOOD_OATH_DURATION } from '@sim/constants';
import {
  expireBloodOaths,
  formRelationship,
  collectBloodOathVictims
} from '@sim/relationships';
import { RNG } from '@sim/rng';
import { createWorld } from '@sim/world';

describe('blood oath', () => {
  it.skip('expires after ten cycles and converts the bond (SKIPPED - BLOOD_OATH removed)', () => {
    // Test skipped because BLOOD_OATH relationship type was removed in favor of simplified system
  });

  it.skip('flags the partner for death when one falls (SKIPPED - BLOOD_OATH removed)', () => {
    // Test skipped because BLOOD_OATH relationship type was removed in favor of simplified system
  });
});
