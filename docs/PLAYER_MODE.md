# Player Mode Documentation

Player Mode is an interactive combat sandbox that allows players to directly control an orc warrior in real-time combat scenarios.

## Accessing Player Mode

Player Mode can be accessed in two ways:

1. **URL Parameter**: Add `?mode=player` to the URL (e.g., `http://localhost:5173/?mode=player`)
2. **Development Command**: Run `npm run dev:player` to start the dev server with Player Mode open

## Controls

| Key | Action | Description |
|-----|--------|-------------|
| `W` `A` `S` `D` | Movement | 8-directional movement with friction |
| `Shift` | Dash | Quick dash with I-frames (invulnerability frames) |
| `Ctrl` | Block | Directional blocking within a 110° arc |
| `Alt` | Lock-On | Toggle lock-on to nearest enemy in forward cone |
| `E` | Signature Move | Execute archetype-specific special ability |
| `R` | Reset | Reset arena and respawn all entities |

## Archetype System

Player Mode uses three unified orc archetypes, each with unique characteristics and signature moves:

### Archer
- **Health**: 80 HP
- **Speed**: 1.2x base speed
- **Damage**: 15 base damage
- **Range**: 3.0 units
- **Signature Move**: **Volley**
  - Fires 5 arrows in a 16° spread
  - 12 damage per arrow
  - 9 second cooldown
  - 28 stamina cost
  - Slight auto-aim when locked on

### Berserker
- **Health**: 120 HP
- **Speed**: 0.9x base speed
- **Damage**: 25 base damage
- **Range**: 1.2 units
- **Signature Move**: **Rage Cleave**
  - AoE attack in 1.6 unit radius
  - 35 damage with 0.8 stagger
  - 250ms wind-up time
  - 8 second cooldown
  - 30 stamina cost

### Trapper
- **Health**: 90 HP
- **Speed**: 1.1x base speed
- **Damage**: 18 base damage
- **Range**: 1.8 units
- **Signature Move**: **Snap Trap**
  - Places trap at player position
  - 200ms placement time, 150ms arm time
  - Roots target for 1200ms, deals 20 damage
  - 10 second cooldown
  - 24 stamina cost
  - Maximum 2 active traps

## Combat Mechanics

### Stamina System
- **Maximum Stamina**: 100
- **Regeneration Rate**: 18 per second
- **Regeneration Delay**: 650ms after stamina use
- All combat actions (dash, block, signature moves) consume stamina

### Dash Mechanics
- **Stamina Cost**: 22
- **I-Frame Duration**: 120ms (invulnerable to damage)
- **Speed Multiplier**: 2.4x movement speed
- **Duration**: 180ms

### Blocking System
- **Stamina Drain**: 18 per blocked hit (minimum 6)
- **Block Angle**: 110° forward arc
- **Damage Reduction**: 60% of incoming damage blocked
- Requires minimum stamina to maintain block

### Lock-On System
- **Range**: 8.0 units
- **Cone Angle**: 135° forward arc
- Targets nearest enemy in cone
- Provides slight camera offset toward target
- Enhances projectile auto-aim

## Test Arena

The Test Arena provides a controlled environment for testing combat mechanics:

- **Arena Size**: Small grid-based arena with spawn points
- **Enemy Waves**: One enemy of each archetype spawns automatically
- **Enemy AI**: Basic seeking behavior - enemies move toward player
- **Reset Functionality**: Press `R` to reset arena and cooldowns

### Enemy Behavior
- Enemies use the same archetype stats as the player
- Simple AI: move toward player, attack when in range
- Each enemy represents one of the three archetypes
- Enemies can be trapped, staggered, and defeated

## HUD Elements

The Player Mode HUD displays:

1. **Archetype Icon**: Shows current player archetype
2. **Stamina Bar**: Real-time stamina level with regeneration
3. **Signature Cooldown**: Visual cooldown timer for special abilities
4. **Lock-On Indicator**: Shows when locked onto a target
5. **Wave Information**: Current wave and remaining enemies
6. **Control Hints**: Reminder of key bindings

## Balance Values

### Stamina Costs
- Dash: 22 stamina
- Block per hit: 18 stamina (min 6)
- Signature moves: 24-30 stamina (varies by archetype)

### Cooldowns
- Archer Volley: 9 seconds
- Berserker Rage Cleave: 8 seconds
- Trapper Snap Trap: 10 seconds

### Damage Values
- Base melee damage: 15-25 (archetype dependent)
- Volley arrows: 12 damage each
- Rage Cleave: 35 damage
- Snap Trap: 20 damage

## Technical Architecture

Player Mode is built as a self-contained system that doesn't interfere with existing Spectate or Free Roam modes:

- **Entry Point**: `src/playerMode/index.ts`
- **Main Component**: `src/playerMode/PlayerModeRoot.tsx`
- **Input System**: `src/playerMode/input/keybinds.ts`
- **Core Systems**: Player controller, camera, lock-on
- **Combat Systems**: Hitbox detection, health management, projectiles
- **Arena**: Test environment with enemy AI

## Known Issues

1. **Canvas Scaling**: Fixed 800x600 canvas that scales to full screen
2. **Enemy AI**: Very basic seeking behavior, no advanced tactics
3. **Audio**: No combat sounds implemented yet
4. **Visual Effects**: Basic shapes, no particle effects
5. **Projectile Physics**: Simple linear movement, no gravity

## Future Enhancements

Potential improvements for future versions:

- Enhanced enemy AI with different behavior patterns
- Visual effects and animations
- Combat audio and sound effects
- Additional signature move variations
- Terrain obstacles and environmental hazards
- Multiplayer combat scenarios
- Advanced projectile physics
- Weapon and equipment system

## Development

### Running Tests
```bash
npm run test:player  # Run player mode specific tests
npm run test         # Run all tests
```

### Development Server
```bash
npm run dev:player   # Start with player mode open
npm run dev          # Standard development server
```

### Building
```bash
npm run build        # Build for production
npm run typecheck    # Type checking only
```