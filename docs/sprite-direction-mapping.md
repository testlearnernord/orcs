# Sprite Direction Mapping Guide

## Universal LPC Spritesheet Standard

When implementing new archetypes, all sprite sheets must follow the Universal LPC Spritesheet Generator standard for direction mapping. This ensures consistency across all character types.

### Standard Row Mapping

The Universal LPC Spritesheet Generator uses the following **fixed** row layout:

| Row | Direction | Description |
|-----|-----------|-------------|
| 0   | DOWN      | Character facing down (south) |
| 1   | LEFT      | Character facing left (west) |
| 2   | RIGHT     | Character facing right (east) |
| 3   | UP        | Character facing up (north) |

### Implementation in Code

When creating atlas configuration for any archetype, use this exact mapping:

```typescript
// Universal LPC Spritesheet Generator standard mapping:
// Row 0: DOWN sprites (character facing down/south)
// Row 1: LEFT sprites (character facing left/west)  
// Row 2: RIGHT sprites (character facing right/east)
// Row 3: UP sprites (character facing up/north)
rowByDir: { D: 0, L: 1, R: 2, U: 3 } as const
```

### WASD Key Mapping

The WASD keys correspond to the following directions in screen coordinates:

- **W Key**: Move up (negative Y) → UP direction (Row 3)
- **A Key**: Move left (negative X) → LEFT direction (Row 1)  
- **S Key**: Move down (positive Y) → DOWN direction (Row 0)
- **D Key**: Move right (positive X) → RIGHT direction (Row 2)

### Verification

Always verify your sprite direction mapping with these tests:

1. **W Key**: Character should face UP (north) - sprite from Row 3
2. **A Key**: Character should face LEFT (west) - sprite from Row 1
3. **S Key**: Character should face DOWN (south) - sprite from Row 0  
4. **D Key**: Character should face RIGHT (east) - sprite from Row 2

### Historical Note

Prior to this fix, the berserker archetype used an incorrect empirical mapping that did not follow the Universal LPC standard. This caused sprite directions to be misaligned with player input expectations.

### Reference Links

- [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/)
- [Issue #170: Sprite Direction Mapping Documentation](https://github.com/testlearnernord/orcs/issues/170)