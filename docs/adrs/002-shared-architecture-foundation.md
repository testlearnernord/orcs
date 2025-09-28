# ADR-002: Shared Architecture Foundation with Types and Feature Flags

## Status
✅ **ACCEPTED and IMPLEMENTED** (2025-09-28)

## Context
The codebase was growing organically without clear architectural boundaries:
- Ad-hoc type definitions scattered across files
- No centralized configuration system
- Features tightly coupled with unclear dependencies
- Difficult for AI assistants to understand code structure
- No runtime feature toggles for A/B testing or gradual rollouts

This was hindering:
- Code maintainability and refactoring
- New feature development
- Testing and debugging
- AI-assisted development
- Performance optimization

## Decision

### 1. Comprehensive Shared Type System
**Decision**: Centralize all type definitions in `src/shared/types/`.

**Implementation**:
```typescript
// src/shared/types/common.ts - Universal types
export type EntityId = string;
export type GameMode = 'SPECTATE' | 'PLAYER' | 'FREE_ROAM';
export interface Position { x: number; y: number; }

// src/shared/types/game.ts - Game-specific types  
export interface Officer {
  id: EntityId;
  name: string;
  rank: OfficerRank;
  // ... full type definitions
}
```

**Rationale**:
- **Single source of truth** for all entity definitions
- **AI comprehensibility**: Clear contracts between modules
- **Type safety**: Prevent runtime errors through compile-time checks
- **Refactoring safety**: Changes propagate through type system

### 2. Feature Flags System
**Decision**: Runtime configuration system with multiple override levels.

**Implementation**:
```typescript
// src/shared/config/flags.ts
export const FLAGS: FeatureFlags = {
  ...DEFAULT_FLAGS,           // Base configuration
  ...getEnvironmentFlags(),   // Environment-based (dev/prod)
  ...getStorageFlags(),       // localStorage persistence
  ...getUrlFlags(),           // URL parameter overrides
};

// Usage
if (isFeatureEnabled('NEW_COMBAT_SYSTEM')) {
  // Safe to enable new functionality
}
```

**Override Priority** (highest to lowest):
1. URL parameters: `?flags=FEATURE:true`
2. localStorage: Persistent dev settings
3. Environment: Dev vs production differences
4. Defaults: Baseline configuration

**Rationale**:
- **A/B testing**: Enable features for specific users
- **Gradual rollouts**: Deploy features incrementally
- **Debug isolation**: Toggle problematic features quickly
- **Development flexibility**: Enable experimental features

### 3. Domain-Oriented Directory Structure
**Decision**: Organize code by business domain rather than technical layers.

**Implementation**:
```
src/
  app/              # Application bootstrap and routing
  features/         # Business domain modules
    portraits/      # Portrait loading and display
    audio/          # Audio management
    simulation/     # Game simulation logic
    combat/         # Combat system
    map/            # World map and navigation
  shared/           # Cross-cutting concerns  
    types/          # Type definitions
    config/         # Configuration and flags
    ui/             # Reusable UI components
    lib/            # Utility functions
```

**Rationale**:
- **Domain clarity**: Business logic grouped logically
- **Module boundaries**: Clear interfaces between features
- **Scalability**: Easy to add new features without disrupting existing ones
- **Team collaboration**: Different teams can work on different features

### 4. TypeScript Path Mappings
**Decision**: Clean import paths with semantic aliases.

**Implementation**:
```typescript
// tsconfig.json
"paths": {
  "@shared/*": ["src/shared/*"],
  "@features/*": ["src/features/*"],
  "@app/*": ["src/app/*"]
}

// Usage
import { Officer, isFeatureEnabled } from '@shared/types';
import { AudioManager } from '@features/audio';
```

**Rationale**:
- **Readability**: Clear semantic meaning in imports
- **Refactoring safety**: Centralized path management
- **IDE support**: Better autocompletion and navigation

## Alternatives Considered

### 1. Redux/Zustand for Configuration
**Rejected**: Overkill for feature flags. Static configuration with runtime overrides is simpler.

### 2. Monolithic Types File
**Rejected**: Would become unwieldy. Domain-split approach scales better.

### 3. Environment Variables for Feature Flags
**Rejected**: Not flexible enough for runtime toggling. Limited to build-time decisions.

## Consequences

### ✅ Positive
- **Improved AI comprehensibility**: Clear type contracts and boundaries
- **Better developer experience**: Semantic imports and type safety
- **Runtime flexibility**: Feature flags enable A/B testing and rollbacks
- **Maintainability**: Clear separation of concerns and dependencies
- **Testing improvements**: Easy to mock feature boundaries
- **Documentation**: Types serve as living documentation

### ⚠️ Challenges
- **Migration complexity**: Existing code needs gradual migration
- **Learning curve**: Developers need to understand new patterns
- **Type maintenance**: Keeping types synchronized with implementation

### 🔄 Neutral
- **Bundle size**: Minimal impact (types erased at runtime)
- **Runtime performance**: Feature flag checks are lightweight

## Implementation Status

### ✅ Completed
- [x] Core type definitions (`common.ts`, `game.ts`)
- [x] Feature flags system with all override levels
- [x] Directory structure established
- [x] TypeScript path mappings configured
- [x] Development debug tools (`window.__orcsFlags`)

### 🔄 In Progress
- [ ] Migration of existing features to new structure
- [ ] Service layer extraction
- [ ] ESLint rules for import boundaries

### 📋 Planned
- [ ] Complete feature module migrations
- [ ] Service pattern implementation
- [ ] Bundle splitting by feature
- [ ] Performance monitoring integration

## Usage Guidelines

### For Developers
```typescript
// 1. Import types from shared location
import { Officer, GameMode } from '@shared/types';

// 2. Check feature flags before new functionality
if (isFeatureEnabled('EXPERIMENTAL_FEATURE')) {
  // New code here
}

// 3. Use semantic import paths
import { PortraitLoader } from '@features/portraits';
```

### For AI Assistants
- **Types first**: Check `src/shared/types/` for entity definitions
- **Feature boundaries**: Respect module boundaries, use shared types for communication
- **Feature flags**: Use for experimental or conditional features
- **Path aliases**: Use `@shared/*`, `@features/*` for clean imports

## Monitoring & Success Metrics

### Code Quality Metrics
- **Type coverage**: >95% of functions typed
- **Import violations**: 0 cross-feature imports (future ESLint rule)
- **Feature flag usage**: >80% of new features use flags initially

### Development Metrics
- **Build time**: Maintain <5 seconds
- **IDE performance**: Fast type checking and autocomplete
- **Onboarding time**: New developers productive faster

### Runtime Metrics
- **Feature flag performance**: <1ms per flag check
- **Bundle impact**: <10KB overhead for type system

## Future Evolution

### Phase 2: Service Layer
Extract side effects into service pattern:
```typescript
// src/shared/services/
export interface PortraitService {
  loadAtlas(id: string): Promise<ImageAtlas>;
  preloadAll(): Promise<void>;
}
```

### Phase 3: Module Federation
Consider micro-frontend approach for larger features:
- Independent deployment
- Runtime module loading
- Team autonomy

## References
- **Type definitions**: `src/shared/types/`
- **Feature flags**: `src/shared/config/flags.ts`
- **Development guide**: `docs/DEV_GUIDE.md`
- **AI guide**: `docs/AI_GUIDE.md`

---

**Impact**: This foundation enables scalable development with clear boundaries, type safety, and runtime flexibility while significantly improving AI comprehensibility and developer experience.