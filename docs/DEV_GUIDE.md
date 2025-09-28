# Orcs Development Guide

## Quick Start

```bash
# Clone and setup
git clone https://github.com/testlearnernord/orcs.git
cd orcs
npm install

# Development server
npm run dev              # Standard dev server
npm run dev:player      # Opens directly in player mode

# Build and deploy
npm run build           # Production build
npm run preview         # Preview production build
```

## Project Structure

```
src/
  app/              # Application entry point and routing
  features/         # Domain-specific feature modules
    portraits/      # Portrait loading and display
    audio/          # Audio management
    simulation/     # Game simulation logic
    spectate/       # Spectate mode UI
    combat/         # Player combat system
    map/            # Map and free roam features
  shared/           # Reusable code across features
    types/          # TypeScript type definitions
    config/         # Configuration and feature flags
    ui/             # Shared UI components
    lib/            # Utility libraries
  sim/              # Core simulation engine
  playerMode/       # Player mode implementation
  ui/               # Legacy UI components (being migrated)
  state/            # Global state management
```

## Development Workflow

### 1. Feature Development
1. **Check feature flags**: Use `src/shared/config/flags.ts` to control new features
2. **Add types**: Define interfaces in `src/shared/types/`
3. **Create feature module**: Add to `src/features/` with clear boundaries
4. **Test coverage**: Add tests alongside implementation
5. **Update documentation**: Keep this guide current

### 2. Asset Management
```bash
# Development: Copy assets to public/
npm run copy:dev

# Production: Assets copied to docs/ during build
npm run build
```

**Asset Pipeline Rules:**
- Source assets live in `src/assets/`
- Dev server serves from `public/`
- Production serves from `docs/`
- No triple duplication (fixed in recent refactor)

### 3. Code Quality
```bash
# Check formatting
npm run format:check
npm run format         # Auto-fix

# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test
npm run test:player    # Player mode specific tests

# Complete CI pipeline
npm run ci
```

## Feature Flags System

Control features at runtime using the flags system:

```typescript
import { FLAGS, isFeatureEnabled } from '@shared/config/flags';

// Check feature availability
if (isFeatureEnabled('PLAYER_MODE_ENABLED')) {
  // Enable player mode functionality
}

// Access flags directly
if (FLAGS.DEV_DEBUG_TOOLS) {
  console.log('Debug mode active');
}
```

### URL Override
```
http://localhost:5173/orcs/?flags=AUDIO_ENABLED:false,DEV_OVERLAY:true
```

### Development Console
```javascript
// Available in dev mode
window.__orcsFlags.debugFlags();        // Show all flags
window.__orcsFlags.setFlag('AUDIO_ENABLED', false);
window.__orcsFlags.resetFlags();
```

## Game Modes

### SPECTATE Mode
- **Purpose**: Watch AI simulation unfold
- **Key Files**: `src/features/spectate/`
- **Controls**: E (next cycle), space (auto-advance)
- **Focus**: Authentic AI behavior, relationships, warcalls

### PLAYER Mode  
- **Purpose**: Direct combat gameplay
- **Key Files**: `src/playerMode/`, `src/features/combat/`
- **Controls**: WASD movement, mouse lock-on, click attack
- **Focus**: Top-down souls-like combat

### FREE ROAM Mode
- **Purpose**: Explore world, interact with officers
- **Key Files**: `src/features/map/`
- **Controls**: WASD movement, mouse interaction
- **Focus**: Officer behavior, pathfinding, world simulation

## Performance & Debugging

### Bundle Analysis
```bash
# Enable bundle analysis
npm run build -- --analyze

# Performance monitoring (dev only)
?flags=DEV_PERFORMANCE_MONITORING:true
```

### Asset Auditing
```bash
# Find unused code and assets
npm run audit:all

# Individual audits
npm run audit:imports     # Unused files
npm run audit:assets      # Unused assets  
npm run audit:duplicates  # Duplicate files
```

### Memory Profiling
1. Enable dev tools: `?flags=DEV_DEBUG_TOOLS:true`
2. Use browser DevTools Performance tab
3. Check for listener leaks in global singletons
4. Monitor frame drops during simulation

## Architecture Patterns

### 1. Feature Boundaries
- Features should be self-contained
- Use `@shared/types` for cross-feature communication
- Avoid direct imports between features
- Use event bus for loose coupling

### 2. State Management
```typescript
// Prefer local state where possible
const [localState, setLocalState] = useState();

// Use global state for shared data
import { useStore } from '@state/store';
```

### 3. Asset Loading
```typescript
// Use proper loaders
import { loadPortraitAtlas } from '@features/portraits';
import { loadAudioTrack } from '@features/audio';

// Handle loading states
const [assets, setAssets] = useState<AsyncState<AssetData>>();
```

## Testing Strategy

### Unit Tests
- Focus on business logic and utilities
- Mock external dependencies
- Test edge cases and error conditions

### Integration Tests  
- Feature module interactions
- Asset loading pipelines
- State management flows

### E2E Tests (Planned)
- Game mode transitions
- Simulation progression
- Combat interactions

## Common Pitfalls

### ❌ Don't
- Import between feature modules directly
- Create global singletons without cleanup
- Hardcode asset paths
- Skip error handling
- Forget to update types

### ✅ Do
- Use shared types for contracts
- Implement proper cleanup in effects
- Use feature flags for new functionality
- Handle async states properly
- Add TypeScript types for everything

## Debugging Tips

### 1. Simulation Issues
```javascript
// Enable simulation debugging
localStorage.setItem('orcs:feature-flags', 
  JSON.stringify({ DEV_DEBUG_TOOLS: true }));

// Check officer state
console.table(store.getState().officers);

// Monitor warcalls
store.subscribe(() => console.log('Warcalls:', store.getState().warcalls));
```

### 2. Combat Issues
```javascript
// Enable combat debugging
?flags=DEV_DEBUG_TOOLS:true

// Check player state in console
window.__orcsPlayer.getState();

// Monitor hit detection
window.__orcsPlayer.debugHitboxes = true;
```

### 3. Asset Issues
```bash
# Check what assets are loaded
npm run audit:assets

# Verify asset paths
npm run build && ls -la docs/assets/
```

## Deployment

### GitHub Pages
1. `npm run build` creates production build in `docs/`
2. Push to main branch
3. GitHub Pages serves from `docs/`
4. Base path is automatically set to `/orcs/`

### Local Testing
```bash
npm run build      # Build production version
npm run preview    # Test production build locally
```

## Hot Reload & Fast Development

### Vite Configuration
- TypeScript path mappings configured
- React Fast Refresh enabled
- Asset hot reloading for images/audio
- CSS hot module replacement

### Development Server
```bash
npm run dev        # Standard development
npm run dev:player # Direct to player mode
```

## Contributing

1. **Follow the architecture**: Use feature modules and shared types
2. **Add tests**: Especially for business logic
3. **Update documentation**: Keep this guide current
4. **Use feature flags**: For experimental features
5. **Run audits**: Check for waste with `npm run audit:all`
6. **Type everything**: Leverage TypeScript fully

## Getting Help

- **Architecture questions**: Check `src/shared/types/` for contracts
- **Feature flags**: See `src/shared/config/flags.ts`
- **Asset issues**: Run `npm run audit:assets`
- **Build problems**: Check `npm run ci` output
- **Performance**: Use dev tools and feature flags