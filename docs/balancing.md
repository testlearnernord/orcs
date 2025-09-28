# Orcs Balancing Configuration

## Population Limits

### Officer Hierarchy
| Rank | Maximum Count | Current Logic |
|------|---------------|---------------|
| **King** | 1 | Single ruler, succession by strength/politics |
| **Captains** | 3 | Elite officers, king's trusted lieutenants |
| **Scouts** | 4 | Specialized reconnaissance and mobility |
| **Officers** | 20 | Core leadership, most numerous senior rank |
| **Grunts** | 12 | Basic soldiers, entry level |

**Total Population**: ~40 units maximum

### Promotion Requirements
```typescript
const PROMOTION_REQUIREMENTS = {
  GRUNT_TO_SCOUT: {
    experience: 100,
    survivedCycles: 10,
    traits: ['AGILE', 'OBSERVANT'],
    conditions: ['no_recent_failures']
  },
  SCOUT_TO_OFFICER: {
    experience: 250,
    survivedCycles: 25,
    warcallsCompleted: 5,
    conditions: ['leadership_potential']
  },
  OFFICER_TO_CAPTAIN: {
    experience: 500,
    survivedCycles: 50,
    warcallsLed: 3,
    allies: 2,
    conditions: ['royal_favor', 'combat_proven']
  },
  CAPTAIN_TO_KING: {
    experience: 1000,
    survivedCycles: 100,
    legendaryDeeds: 1,
    conditions: ['king_dead_or_deposed', 'popular_support']
  }
};
```

## Relationship System (Simplified)

### Relationship Types
- **ALLY**: Cooperative, will support in warcalls
- **RIVAL**: Competitive, may oppose or undermine
- **NEUTRAL**: Indifferent, unpredictable behavior

### Relationship Formation
```typescript
const RELATIONSHIP_CHANCES = {
  // Per cycle, when officers interact
  FORM_ALLY: 0.15,      // 15% chance to become allies
  FORM_RIVAL: 0.10,     // 10% chance to become rivals
  CHANGE_TYPE: 0.05,    // 5% chance to change existing relationship
  
  // Modifiers
  TRAIT_COMPATIBILITY: {
    'LOYAL + LOYAL': +0.20,
    'AMBITIOUS + AMBITIOUS': -0.15,
    'BERSERKER + SHAMAN': -0.10,
    'SCOUT + SCOUT': +0.10
  },
  
  PROXIMITY_BONUS: 0.05,    // Same location
  SUCCESSFUL_WARCALL: 0.25, // Fought together successfully
  FAILED_WARCALL: -0.20,    // Failed mission together
};
```

### Relationship Decay
```typescript
const RELATIONSHIP_DECAY = {
  BASE_RATE: 0.02,          // 2% chance per cycle to weaken
  DISTANCE_MODIFIER: 0.01,  // +1% per distance unit
  TIME_MODIFIER: 0.001,     // +0.1% per cycle since formation
  
  // Events that prevent decay
  PREVENT_DECAY: [
    'recent_interaction',
    'same_warcall_participation', 
    'shared_enemy'
  ]
};
```

## Warcall System

### Warcall Types & Frequency
```typescript
const WARCALL_CONFIG = {
  BASE_FREQUENCY: 0.30,     // 30% chance per cycle for any warcall
  COOLDOWN_CYCLES: 3,       // Minimum cycles between warcalls
  
  TYPES: {
    HUNT: {
      weight: 0.35,           // 35% of all warcalls
      participants: [2, 4],   // 2-4 officers
      duration: 1,            // 1 cycle
      rewards: ['experience', 'food'],
      risks: ['injury', 'death_rare']
    },
    
    FEAST: {
      weight: 0.25,           // 25% of all warcalls  
      participants: [3, 8],   // 3-8 officers
      duration: 1,
      rewards: ['relationship_boost', 'morale'],
      risks: ['political_tension']
    },
    
    RAID: {
      weight: 0.20,           // 20% of all warcalls
      participants: [4, 6],   // 4-6 officers
      duration: 2,            // 2 cycles
      rewards: ['loot', 'fame', 'experience'],
      risks: ['injury', 'death', 'enemy_retaliation']
    },
    
    ASSASSINATION: {
      weight: 0.10,           // 10% of all warcalls
      participants: [1, 2],   // 1-2 officers (stealth)
      duration: 1,
      rewards: ['major_fame', 'political_advantage'],
      risks: ['death', 'disgrace', 'rival_formation']
    },
    
    INTRIGUE: {
      weight: 0.08,           // 8% of all warcalls
      participants: [2, 3],   // 2-3 officers
      duration: 1,
      rewards: ['information', 'blackmail', 'allies'],
      risks: ['exposure', 'rival_formation']
    },
    
    RECRUITMENT: {
      weight: 0.02,           // 2% of all warcalls (rare)
      participants: [1, 3],   // 1-3 officers
      duration: 1,
      rewards: ['new_grunt', 'population_growth'],
      risks: ['resource_drain']
    }
  }
};
```

### Success Calculations
```typescript
const SUCCESS_FORMULAS = {
  HUNT: (participants) => {
    const baseChance = 0.70;
    const scoutBonus = participants.filter(p => p.rank === 'SCOUT').length * 0.15;
    const experienceBonus = participants.reduce((sum, p) => sum + p.experience, 0) / 1000;
    return Math.min(0.95, baseChance + scoutBonus + experienceBonus);
  },
  
  RAID: (participants) => {
    const baseChance = 0.50;
    const captainBonus = participants.filter(p => p.rank === 'CAPTAIN').length * 0.20;
    const berserkerBonus = participants.filter(p => p.archetype === 'BERSERKER').length * 0.10;
    return Math.min(0.90, baseChance + captainBonus + berserkerBonus);
  },
  
  // ... other formulas
};
```

## Combat System (Player Mode)

### Base Stats by Archetype
```typescript
const ARCHETYPE_STATS = {
  BERSERKER: {
    attack: 120,      // High damage
    defense: 80,      // Moderate defense
    speed: 90,        // Good mobility
    accuracy: 75,     // Moderate accuracy
    criticalChance: 0.25,
    dodgeChance: 0.15
  },
  
  GUARDIAN: {
    attack: 85,
    defense: 140,     // High defense
    speed: 60,        // Slow
    accuracy: 90,     // High accuracy
    criticalChance: 0.10,
    dodgeChance: 0.05
  },
  
  SCOUT: {
    attack: 90,
    defense: 70,
    speed: 130,       // Very fast
    accuracy: 95,     // Very accurate
    criticalChance: 0.20,
    dodgeChance: 0.30 // High dodge
  },
  
  ASSASSIN: {
    attack: 110,
    defense: 65,
    speed: 115,
    accuracy: 85,
    criticalChance: 0.35, // Very high crit
    dodgeChance: 0.25
  },
  
  SHAMAN: {
    attack: 75,
    defense: 90,
    speed: 80,
    accuracy: 80,
    criticalChance: 0.15,
    dodgeChance: 0.20,
    magicPower: 120   // Special stat
  }
};
```

### Damage Calculations
```typescript
const DAMAGE_FORMULA = {
  baseDamage: (attacker, target, action) => {
    const attackPower = attacker.stats.attack * action.powerMultiplier;
    const defense = target.stats.defense;
    const baseDamage = Math.max(1, attackPower - defense * 0.5);
    
    // Apply modifiers
    let finalDamage = baseDamage;
    
    if (rollCritical(attacker.stats.criticalChance)) {
      finalDamage *= 2.0;
    }
    
    if (rollDodge(target.stats.dodgeChance)) {
      finalDamage = 0;
    }
    
    if (action.type === 'SPECIAL') {
      finalDamage *= 1.5;
    }
    
    return Math.round(finalDamage);
  }
};
```

### Lock-On System
```typescript
const LOCK_ON_CONFIG = {
  MAX_LOCK_DISTANCE: 300,    // pixels
  LOCK_BREAK_DISTANCE: 400,  // pixels
  ORBIT_RADIUS: 120,         // pixels
  ORBIT_SPEED: 0.8,          // radians per second
  
  TARGET_SWITCHING: {
    COOLDOWN: 0.5,           // seconds
    RANGE_MULTIPLIER: 1.2,   // prefer closer targets
    HEALTH_PREFERENCE: 0.3   // slight preference for wounded
  }
};
```

## Simulation Balance

### Cycle Timing
```typescript
const SIMULATION_TIMING = {
  CYCLE_DURATION: 1000,      // 1 second per cycle in auto mode
  FAST_FORWARD: 100,         // 0.1 seconds in fast mode
  
  EVENTS_PER_CYCLE: {
    MIN: 1,                  // At least one event per cycle
    MAX: 3,                  // Maximum events per cycle
    AVERAGE: 1.8             // Target average
  },
  
  EVENT_DISTRIBUTION: {
    WARCALL_INITIATION: 0.30,
    RELATIONSHIP_CHANGE: 0.25,
    OFFICER_ACTION: 0.20,
    PROMOTION_CHECK: 0.15,
    RANDOM_EVENT: 0.10
  }
};
```

### Death & Consequences
```typescript
const DEATH_SYSTEM = {
  BASE_DEATH_CHANCE: {
    HUNT: 0.05,              // 5% death chance
    RAID: 0.15,              // 15% death chance  
    ASSASSINATION: 0.25,     // 25% death chance
    FEAST: 0.01,             // 1% death chance (accidents)
    INTRIGUE: 0.08,          // 8% death chance
    RECRUITMENT: 0.02        // 2% death chance
  },
  
  RANK_MODIFIERS: {
    GRUNT: 1.5,              // 50% more likely to die
    SCOUT: 0.8,              // 20% less likely (agile)
    OFFICER: 1.0,            // Base chance
    CAPTAIN: 0.7,            // 30% less likely (experienced)
    KING: 0.5                // 50% less likely (protected)
  },
  
  CONSEQUENCES: {
    OFFICER_DEATH: [
      'relationship_grief',    // Allies become sad/angry
      'promotion_opportunity', // Opens position for others
      'political_instability', // If high rank
      'revenge_motivation'     // Creates revenge quests
    ]
  }
};
```

## Three Scenario Configurations

### 1. Defensive Scenario
```typescript
const DEFENSIVE_CONFIG = {
  name: "Fortress Mentality",
  description: "Cautious, survival-focused gameplay",
  
  modifiers: {
    WARCALL_FREQUENCY: 0.20,    // -33% fewer warcalls
    DEATH_RATES: 0.7,           // 30% less deadly
    ALLY_FORMATION: 1.3,        // 30% more allies
    RIVAL_FORMATION: 0.8,       // 20% fewer rivals
    PROMOTION_SPEED: 0.8        // 20% slower promotions
  },
  
  populationLimits: {
    king: 1, captains: 3, scouts: 5, officers: 22, grunts: 15
  }
};
```

### 2. Aggressive Scenario  
```typescript
const AGGRESSIVE_CONFIG = {
  name: "Blood and Glory",
  description: "High-risk, high-reward gameplay",
  
  modifiers: {
    WARCALL_FREQUENCY: 0.45,    // +50% more warcalls
    DEATH_RATES: 1.4,           // 40% more deadly
    ALLY_FORMATION: 0.7,        // 30% fewer allies
    RIVAL_FORMATION: 1.5,       // 50% more rivals
    PROMOTION_SPEED: 1.3        // 30% faster promotions
  },
  
  populationLimits: {
    king: 1, captains: 4, scouts: 3, officers: 18, grunts: 10
  }
};
```

### 3. Balanced Scenario (Default)
```typescript
const BALANCED_CONFIG = {
  name: "Middle Path", 
  description: "Standard balanced gameplay",
  
  modifiers: {
    WARCALL_FREQUENCY: 0.30,    // Base frequency
    DEATH_RATES: 1.0,           // Base death rates
    ALLY_FORMATION: 1.0,        // Base ally chance
    RIVAL_FORMATION: 1.0,       // Base rival chance
    PROMOTION_SPEED: 1.0        // Base promotion speed
  },
  
  populationLimits: {
    king: 1, captains: 3, scouts: 4, officers: 20, grunts: 12
  }
};
```

## Performance Targets

### Simulation Performance
- **Target FPS**: 60 FPS during active simulation
- **Cycle Processing**: <16ms per simulation cycle
- **Memory Usage**: <100MB total application memory
- **Event Queue**: Handle 10+ events per frame without lag

### Combat Performance
- **Input Latency**: <50ms from input to visual response
- **Hit Detection**: <1ms per collision check
- **Animation Smoothness**: 60 FPS during combat
- **Lock-On Responsiveness**: <100ms to acquire new target

## Balancing Tools & Monitoring

### Automatic Balancing
```typescript
// Monitor these metrics automatically
const BALANCE_MONITORS = {
  averageSurvivalTime: 'target: 50-80 cycles',
  promotionRate: 'target: 1 promotion per 20 cycles',
  relationshipStability: 'target: 60% relationships last >10 cycles',
  warcallSuccessRate: 'target: 60-75% overall success',
  populationStability: 'target: population variance <20%'
};
```

### Debug Commands
```javascript
// In development mode
window.__orcsBalance = {
  setScenario: (name) => loadBalanceConfig(name),
  getMetrics: () => calculateBalanceMetrics(),
  simulateN: (cycles) => runBalanceTest(cycles),
  resetToDefaults: () => loadBalanceConfig('balanced')
};
```

This balancing configuration ensures authentic, engaging gameplay while maintaining performance and preventing degenerate strategies.