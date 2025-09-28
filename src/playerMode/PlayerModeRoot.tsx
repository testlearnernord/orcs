/**
 * Root component for Player Mode - main combat sandbox
 */

import React, { useEffect, useRef, useState } from 'react';
import { PlayerHUD } from './ui/HUD';
import { LockOnMarker } from './ui/LockOnMarker';
import { PlayerKeybinds } from './input/keybinds';
import { PlayerController } from './systems/playerController';
import { CameraController } from './systems/camera';
import { TestArena } from './scenes/TestArena';
import { ProjectileManager } from '../combat/projectiles';
import { HealthManager } from '../combat/health';
import type { OrcArchetype } from '../simulation/archetypes';
import { SIGNATURE } from '../simulation/archetypes';
import { PlayerEntity } from './entities/player';
import { PlaceholderMeadowBiome } from './biomes/placeholderMeadow';
import { PlayerMusicManager } from '../audio/music';

interface PlayerModeState {
  isInitialized: boolean;
  playerArchetype: OrcArchetype;
  signatureCooldowns: Record<OrcArchetype, number>;
  lastFrameTime: number;
}

export const PlayerModeRoot: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<PlayerModeState>({
    isInitialized: false,
    playerArchetype: 'Berserker',
    signatureCooldowns: {
      Archer: 0,
      Berserker: 0,
      Trapper: 0
    },
    lastFrameTime: 0
  });

  // Game systems
  const systemsRef = useRef<{
    keybinds: PlayerKeybinds;
    playerController: PlayerController;
    camera: CameraController;
    arena: TestArena;
    projectiles: ProjectileManager;
    playerHealth: HealthManager;
    playerEntity: PlayerEntity;
    biome: PlaceholderMeadowBiome;
    music: PlayerMusicManager;
  }>();

  // Animation frame
  const animationRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    // Use a timeout to ensure the canvas ref is attached
    const initTimeout = setTimeout(() => {
      if (!canvasRef.current) {
        return;
      }

      console.log('[PlayerMode] Initializing systems...');

      // Initialize game systems
      const keybinds = new PlayerKeybinds();
      const playerController = new PlayerController({ x: 0, y: 0 });
      const camera = new CameraController({ x: 0, y: 0 });
      const arena = new TestArena();
      const projectiles = new ProjectileManager();
      const playerHealth = new HealthManager('player', 100);

      // Initialize new Player Mode systems
      const playerEntity = new PlayerEntity({
        archetype: state.playerArchetype,
        startPosition: { x: 0, y: 0 },
        playerId: 'player1'
      });
      const biome = new PlaceholderMeadowBiome();
      const music = new PlayerMusicManager();

      systemsRef.current = {
        keybinds,
        playerController,
        camera,
        arena,
        projectiles,
        playerHealth,
        playerEntity,
        biome,
        music
      };

      lastFrameTimeRef.current = Date.now();
      setState((prev) => ({ ...prev, isInitialized: true }));

      console.log('[PlayerMode] Systems initialized, starting game loop...');

      // Initialize music (with slight delay to ensure user interaction)
      setTimeout(() => {
        music.init().catch((error) => {
          console.warn('[PlayerMode] Music initialization failed:', error);
        });
      }, 500);

      // Start game loop
      const gameLoop = () => {
        const now = Date.now();
        const deltaMs = now - lastFrameTimeRef.current;

        if (systemsRef.current && deltaMs > 0) {
          updateGame(deltaMs);
          renderGame();
        }

        lastFrameTimeRef.current = now;
        animationRef.current = requestAnimationFrame(gameLoop);
      };

      animationRef.current = requestAnimationFrame(gameLoop);
    }, 100); // Wait 100ms for canvas to be ready

    // Cleanup
    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (systemsRef.current) {
        systemsRef.current.keybinds.dispose();
        systemsRef.current.music.destroy();
      }
    };
  }, []);

  const updateGame = (deltaMs: number) => {
    if (!systemsRef.current) return;

    const {
      keybinds,
      playerController,
      camera,
      arena,
      projectiles,
      playerEntity,
      music
    } = systemsRef.current;

    // Update input
    keybinds.update();
    const input = keybinds.getState();

    // Handle Player Mode specific inputs
    if (input.musicToggle) {
      music.toggle().catch((error) => {
        console.warn('[PlayerMode] Music toggle failed:', error);
      });
    }

    if (input.arenaReset) {
      // F9 arena reset instead of cycle
      arena.reset();
      playerController.reset(arena.getPlayerSpawn());
      playerEntity.reset(arena.getPlayerSpawn());
      camera.snapTo(arena.getPlayerSpawn());
      setState((prev) => ({
        ...prev,
        signatureCooldowns: {
          Archer: 0,
          Berserker: 0,
          Trapper: 0
        }
      }));
    }

    // Handle reset
    if (input.reset) {
      arena.reset();
      playerController.reset(arena.getPlayerSpawn());
      playerEntity.reset(arena.getPlayerSpawn());
      camera.snapTo(arena.getPlayerSpawn());
      setState((prev) => ({
        ...prev,
        signatureCooldowns: {
          Archer: 0,
          Berserker: 0,
          Trapper: 0
        }
      }));
    }

    // Update player controller with available targets for lock-on
    const enemies = arena.getEnemies();
    const lockOnTargets = enemies.map((enemy) => ({
      id: enemy.id,
      pos: enemy.position,
      alive: enemy.isAlive
    }));
    
    playerController.setAvailableTargets(lockOnTargets);
    
    // Update player controller
    playerController.update(deltaMs, input);
    const playerState = playerController.getState();
    const playerActions = playerController.getActions();

    // Update player entity with controller state and actions
    playerEntity.update(playerState, playerActions);

    // Update camera to follow player with lock-on support
    camera.setTarget(playerState.position);
    
    // Set camera lock-on target if active
    const currentLockTarget = playerController.getCurrentLockOnTarget();
    if (currentLockTarget) {
      camera.setLockOnTarget(currentLockTarget.pos);
    } else {
      camera.setLockOnTarget(undefined);
    }
        camera.setLockOnTarget(undefined);
    }

    // Process player actions (removed duplicate getActions call)
    for (const action of playerActions) {
      if (action.type === 'signature') {
        handleSignatureMove(action.data);
      }
    }

    // Update systems
    camera.update(deltaMs);
    arena.update(deltaMs);
    projectiles.update(
      deltaMs,
      lockOnTargets.map((t) => ({ ...t, radius: 0.5 }))
    );

    // Update cooldowns
    setState((prev) => ({
      ...prev,
      signatureCooldowns: {
        Archer: Math.max(0, prev.signatureCooldowns.Archer - deltaMs / 1000),
        Berserker: Math.max(
          0,
          prev.signatureCooldowns.Berserker - deltaMs / 1000
        ),
        Trapper: Math.max(0, prev.signatureCooldowns.Trapper - deltaMs / 1000)
      }
    }));
  };

  const handleSignatureMove = (_data: any) => {
    if (!systemsRef.current) return;

    const { playerController } = systemsRef.current;
    const signatureData = SIGNATURE[state.playerArchetype];

    // Check cooldown and stamina
    if (state.signatureCooldowns[state.playerArchetype] > 0) return;
    if (!playerController.consumeStamina(signatureData.staminaCost)) return;

    // Set cooldown
    setState((prev) => ({
      ...prev,
      signatureCooldowns: {
        ...prev.signatureCooldowns,
        [state.playerArchetype]: signatureData.cooldown
      }
    }));

    // Execute signature move (simplified for now)
    console.log(`Executing ${signatureData.name} for ${state.playerArchetype}`);
  };

  const renderGame = () => {
    if (!canvasRef.current || !systemsRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { camera, arena, playerEntity, biome } = systemsRef.current;
    const cameraPos = camera.getPosition();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw biome background instead of solid color
    biome.render(ctx, cameraPos, {
      width: canvas.width,
      height: canvas.height
    });

    // Save context and apply camera transform
    ctx.save();
    ctx.translate(
      canvas.width / 2 - cameraPos.x * 50,
      canvas.height / 2 - cameraPos.y * 50
    );

    // Draw entities (enemies)
    const entities = arena.getEntities();
    for (const entity of entities) {
      if (!entity.isPlayer) {
        // Don't draw player here, use playerEntity instead
        drawEntity(ctx, entity);
      }
    }

    // Draw player entity (replaces the old player drawing)
    playerEntity.render(ctx);

    // Draw projectiles
    const projectiles = systemsRef.current.projectiles.getProjectiles();
    for (const projectile of projectiles) {
      drawProjectile(ctx, projectile);
    }

    ctx.restore();
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, entity: any) => {
    const x = entity.position.x * 50;
    const y = entity.position.y * 50;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(entity.rotation);

    // Draw entity based on type
    if (entity.isPlayer) {
      ctx.fillStyle = '#4a9';
      ctx.fillRect(-15, -15, 30, 30);

      // Draw direction indicator
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, -3, 8, 6);
    } else {
      // Enemy
      const colors = { Archer: '#4a9', Berserker: '#c44', Trapper: '#94a' };
      ctx.fillStyle = colors[entity.archetype as keyof typeof colors];
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw health bar
    if (!entity.isPlayer) {
      const healthPercent = entity.health.getHealthPercent();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x - 15, y - 25, 30, 4);
      ctx.fillStyle =
        healthPercent > 0.5 ? '#4a4' : healthPercent > 0.2 ? '#aa4' : '#a44';
      ctx.fillRect(x - 15, y - 25, 30 * healthPercent, 4);
    }
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, projectile: any) => {
    const x = projectile.position.x * 50;
    const y = projectile.position.y * 50;

    ctx.fillStyle = '#ff6';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  if (!state.isInitialized || !systemsRef.current) {
    return (
      <>
        <div>Loading Player Mode...</div>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{
            width: '100%',
            height: '100%',
            background: '#000',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        />
      </>
    );
  }

  const playerState = systemsRef.current.playerController.getState();
  const currentLockTarget = systemsRef.current.playerController.getCurrentLockOnTarget();
  const cameraPos = systemsRef.current.camera.getPosition();
  const arena = systemsRef.current.arena;
  const enemies = arena.getEnemies();

  return (
    <>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />

      <PlayerHUD
        archetype={state.playerArchetype}
        stamina={playerState.stamina}
        signatureCooldown={state.signatureCooldowns[state.playerArchetype]}
        isLockingOn={playerState.isLockedOn}
        waveInfo={{
          current: 1,
          enemiesLeft: enemies.length
        }}
      />

      {currentLockTarget && (
        <LockOnMarker
          targetPosition={currentLockTarget.pos}
          cameraPosition={cameraPos}
          screenCenter={{ x: 400, y: 300 }}
          isActive={true}
        />
      )}
    </>
  );
};

