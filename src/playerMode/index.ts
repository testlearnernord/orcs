/**
 * Player Mode entry point and bootstrap
 */

import React from 'react';
import { PlayerModeRoot } from './PlayerModeRoot';

/**
 * Bootstrap function to initialize Player Mode
 */
export function bootstrapPlayerMode(): React.ReactElement {
  return React.createElement(PlayerModeRoot);
}

// Re-export key types and components for external use
export type { OrcArchetype } from '../simulation/archetypes';
export { ARCHETYPES, BALANCE, SIGNATURE } from '../simulation/archetypes';
export { PlayerModeRoot } from './PlayerModeRoot';
export { PlayerKeybinds } from './input/keybinds';
export { PlayerController } from './systems/playerController';
export { CameraController } from './systems/camera';
export { LockOnController } from './systems/lockOn';
export { TestArena } from './scenes/TestArena';
export { PlayerHUD } from './ui/HUD';
export { LockOnMarker } from './ui/LockOnMarker';