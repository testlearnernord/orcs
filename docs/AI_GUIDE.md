# AI Development Guide for Orcs Project

## Overview for AI Assistants

This guide helps AI assistants understand the Orcs project architecture, make appropriate changes, and maintain code quality. The project is a **Top-Down Survival Rogue-Lite** with deep simulation and combat mechanics.

## Core Architecture Principles

### 1. Domain-Driven Structure
```
src/
  shared/           # Common utilities, types, and configuration
  features/         # Self-contained feature modules  
  app/              # Application bootstrapping
  sim/              # Core simulation engine
  playerMode/       # Combat system implementation
```

**Rule**: Features should be self-contained and communicate through shared types and events.

### 2. Type Safety First
All major entities are typed in `src/shared/types/`:
- `Officer`: Game characters with traits, relationships, positions
- `Warcall`: Events that drive the simulation forward
- `RelationshipType`: ALLY | RIVAL | NEUTRAL (simplified system)
- `GameMode`: SPECTATE | PLAYER | FREE_ROAM

**Rule**: Always use existing types. Add new types to `src/shared/types/` when needed.

### 3. Feature Flags System
Control functionality via `src/shared/config/flags.ts`:
```typescript
import { isFeatureEnabled } from '@shared/config/flags';

if (isFeatureEnabled('NEW_FEATURE')) {
  // Safe to enable new functionality
}
```

**Rule**: Use feature flags for experimental or conditional features.

## Key Invariants (Never Violate)

### Game Logic Invariants
1. **Population Limits**: King=1, Captains≤3, Scouts≤4, Officers=20, Grunts=12
2. **Relationship Types**: Only ALLY, RIVAL, NEUTRAL (no complex emotional states)
3. **Deterministic Simulation**: Same seed + same actions = same result
4. **Officer IDs**: Must be unique strings across the entire world

### Asset Management Invariants
1. **Source assets** live in `src/assets/`
2. **Dev assets** copied to `public/` (dev server)
3. **Production assets** copied to `docs/` (build output)
4. **Never create triple duplication** (src/ + public/ + docs/)

### Performance Invariants
1. **Bundle size**: Keep under 400KB compressed
2. **Frame rate**: Maintain 60fps during simulation
3. **Memory**: Clean up event listeners and subscriptions
4. **Asset loading**: Use lazy loading for large assets

## Public APIs by Feature

### Portraits (`src/features/portraits/`)
```typescript
// Main exports
export { PORTRAIT_SOURCES } from './config';
export { loadPortraitAtlas } from './loader';
export { default as OfficerAvatar } from './Avatar';

// Usage
<OfficerAvatar officer={officer} size="large" />
```

### Audio (`src/features/audio/`)
```typescript
// Main exports  
export { AudioManager } from './manager';
export { AUDIO_TRACKS } from './tracks';

// Usage
audioManager.play('battle-theme');
audioManager.setVolume(0.8);
```

### Simulation (`src/features/simulation/`)
```typescript
// Main exports
export { runSimulationCycle } from './engine';
export { createOfficer, promoteOfficer } from './officers';
export { triggerWarcall } from './warcalls';

// Usage
const newState = runSimulationCycle(currentState, rng);
```

### Combat (`src/features/combat/`)
```typescript
// Main exports
export { LockOnSystem } from './lockOn';
export { CombatSystem } from './system';
export { calculateDamage } from './damage';

// Usage
const damage = calculateDamage(attacker, target, action);
```

## Common Patterns & Do's/Don'ts

### ✅ Do This

#### Asset Loading
```typescript
// Proper async asset loading
const [atlas, setAtlas] = useState<AsyncState<ImageAtlas>>();

useEffect(() => {
  setAtlas({ state: 'loading' });
  loadPortraitAtlas('officers1')
    .then(data => setAtlas({ state: 'success', data }))
    .catch(error => setAtlas({ state: 'error', error: error.message }));
}, []);
```

#### Type-Safe Officer Creation
```typescript
import { Officer, EntityId } from '@shared/types';

function createNewOfficer(name: string): Officer {
  return {
    id: generateId(),
    name,
    traits: [],
    position: { x: 0, y: 0 },
    rank: 'GRUNT',
    archetype: 'BERSERKER',
    health: 100,
    maxHealth: 100,
    experience: 0,
    level: 1,
    isDead: false
  };
}
```

#### Event Bus Usage
```typescript
import { EventBus } from '@state/eventBus';

// Subscribe to events
const unsubscribe = eventBus.on('officer-died', (officer) => {
  console.log(`${officer.name} has fallen`);
});

// Clean up
useEffect(() => unsubscribe, []);
```

### ❌ Don't Do This

#### Hardcoded Asset Paths
```typescript
// BAD
const imageUrl = '/orcs/assets/portraits/officers1.png';

// GOOD  
import { PORTRAIT_SOURCES } from '@features/portraits';
const imageUrl = PORTRAIT_SOURCES[0].urls[0];
```

#### Direct Feature Dependencies
```typescript
// BAD
import { SomeFunction } from '../combat/system';

// GOOD
import { SomeFunction } from '@shared/lib/combat';
// or use event bus for communication
```

#### Missing Error Handling
```typescript
// BAD
const officer = await loadOfficer(id);
officer.promote();

// GOOD
try {
  const officer = await loadOfficer(id);
  if (officer) {
    officer.promote();
  }
} catch (error) {
  console.error('Failed to load officer:', error);
  // Handle gracefully
}
```

## Making Changes Safely

### 1. Before Modifying Code
```bash
# Understand current state
npm run audit:all
npm run typecheck
npm run test
```

### 2. Adding New Features
```typescript
// 1. Add feature flag
// src/shared/config/flags.ts
NEW_FEATURE_ENABLED: boolean;

// 2. Add types if needed
// src/shared/types/game.ts
export interface NewFeatureConfig {
  enabled: boolean;
  settings: Record<string, unknown>;
}

// 3. Implement with guards
if (isFeatureEnabled('NEW_FEATURE_ENABLED')) {
  // New functionality here
}
```

### 3. Modifying Assets
```bash
# Add to src/assets/ (source)
cp new-asset.png src/assets/category/

# Update manifest if needed
# Edit appropriate config in src/features/

# Test both dev and production
npm run copy:dev  # For development
npm run build     # For production
```

### 4. Simulation Changes
Always consider:
- **Determinism**: Same inputs = same outputs
- **Balance**: Don't break population limits
- **Performance**: Avoid O(n²) algorithms
- **State consistency**: Update all dependent systems

## Testing Strategy for AI

### 1. Smoke Tests (Always Run)
```bash
npm run build      # Must succeed
npm run test       # Must pass
npm run typecheck  # Must have no errors
```

### 2. Feature-Specific Tests
```bash
npm run test:player           # Combat system
npm run test -- portraits    # Portrait loading
npm run test -- simulation   # Core logic
```

### 3. Asset Validation
```bash
npm run audit:all   # Check for waste
npm run guard:portraits  # Portrait system integrity
```

## Debugging for AI

### 1. Enable Debug Mode
```typescript
// Set feature flags for debugging
localStorage.setItem('orcs:feature-flags', 
  JSON.stringify({ 
    DEV_DEBUG_TOOLS: true,
    DEV_OVERLAY: true 
  }));
```

### 2. Common Debug Commands
```javascript
// In browser console (dev mode only)
window.__orcsFlags.debugFlags();  // Show all flags
window.__orcsDebug.dumpState();   // Show game state
window.__orcsDebug.officers;      // Officer data
window.__orcsDebug.simulation;    // Simulation state
```

### 3. Simulation Debugging
```typescript
// Enable verbose logging
import { DEBUG_FLAGS } from '@shared/config/debug';
DEBUG_FLAGS.SIMULATION_VERBOSE = true;

// Check officer states
console.table(world.officers);

// Monitor warcalls
console.log('Active warcalls:', world.activeWarcalls);
```

## Performance Guidelines for AI

### 1. Bundle Size Monitoring
```bash
# Check current size
npm run build
# Look for size warnings

# Analyze bundle
npm run build -- --analyze
```

### 2. Memory Management
```typescript
// Always clean up subscriptions
useEffect(() => {
  const subscription = eventBus.on('event', handler);
  return () => subscription(); // Cleanup
}, []);

// Prefer local state over global
const [localState, setLocalState] = useState();
// Over global store where possible
```

### 3. Asset Optimization
- Use WebP over PNG where possible
- Lazy load large assets
- Preload critical path assets only
- Remove unused assets (use audit tools)

## Integration Points

### 1. With Game Engine
- Simulation state flows through `src/sim/`
- UI reacts to state changes via stores
- Combat integrates with simulation results

### 2. With Asset Pipeline
- Assets processed during build
- Feature modules declare dependencies
- Runtime loading handles failures gracefully

### 3. With UI System
- Features export React components
- Shared UI components in `src/shared/ui/`
- Style consistency via CSS custom properties

## Error Recovery Patterns

### 1. Asset Loading Failures
```typescript
// Graceful degradation
const atlas = usePortraitAtlas('officers1');
if (atlas.state === 'error') {
  return <PlaceholderAvatar />;
}
```

### 2. Simulation Errors
```typescript
// Prevent cascade failures
try {
  const newState = runSimulationCycle(state, rng);
  return newState;
} catch (error) {
  console.error('Simulation error:', error);
  return state; // Return previous state
}
```

### 3. Feature Flag Failures
```typescript
// Safe feature checking
const isEnabled = isFeatureEnabled('RISKY_FEATURE') && 
                  !hasReportedErrors();
```

## Final Guidelines

1. **Preserve game balance**: Don't break population limits or determinism
2. **Maintain performance**: Keep bundle small, frame rate high
3. **Use types extensively**: Leverage TypeScript for safety
4. **Test incrementally**: Run tests after each change
5. **Document changes**: Update this guide when adding new patterns
6. **Check audits**: Use `npm run audit:all` to catch waste
7. **Respect feature boundaries**: Don't create tight coupling
8. **Handle errors gracefully**: UI should degrade, not crash

## Quick Reference

```bash
# Development
npm run dev
npm run copy:dev

# Quality checks  
npm run ci
npm run audit:all

# Feature flags
?flags=FEATURE:true

# Debug console
window.__orcsFlags
window.__orcsDebug

# Key directories
src/shared/types/     # Type definitions
src/shared/config/    # Feature flags
src/features/         # Feature modules
```

This guide evolves with the codebase. Update it when adding new patterns or changing architecture.