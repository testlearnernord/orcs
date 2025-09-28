/**
 * Player Mode HUD showing stamina, cooldowns, and archetype info
 */

import React from 'react';
import type { OrcArchetype } from '../../simulation/archetypes';
import { BALANCE, SIGNATURE } from '../../simulation/archetypes';

export interface HUDProps {
  archetype: OrcArchetype;
  stamina: number;
  signatureCooldown: number;
  isLockingOn: boolean;
  waveInfo?: {
    current: number;
    enemiesLeft: number;
  };
}

export const PlayerHUD: React.FC<HUDProps> = ({
  archetype,
  stamina,
  signatureCooldown,
  isLockingOn,
  waveInfo
}) => {
  const staminaPercent = (stamina / BALANCE.staminaMax) * 100;
  const signatureData = SIGNATURE[archetype];
  const cooldownPercent = Math.max(
    0,
    (signatureCooldown / signatureData.cooldown) * 100
  );

  const hudStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px 20px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    fontFamily: '"Courier New", monospace',
    fontSize: '14px'
  };

  const archetypeIconStyles: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    background:
      archetype === 'Archer'
        ? '#4a9'
        : archetype === 'Berserker'
          ? '#c44'
          : '#94a'
  };

  const staminaBarStyles: React.CSSProperties = {
    width: '120px',
    height: '8px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden'
  };

  const staminaFillStyles: React.CSSProperties = {
    height: '100%',
    width: `${staminaPercent}%`,
    background: 'linear-gradient(90deg, #4a9, #6c6)',
    transition: 'width 0.2s ease'
  };

  const signatureCooldownStyles: React.CSSProperties = {
    position: 'relative',
    width: '24px',
    height: '24px',
    border: '2px solid white',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px'
  };

  const cooldownOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: `${cooldownPercent}%`,
    background: 'rgba(255, 0, 0, 0.6)',
    transition: 'width 0.1s ease'
  };

  const controlsStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    opacity: 0.8,
    whiteSpace: 'nowrap'
  };

  return (
    <div style={hudStyles}>
      {/* Archetype Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={archetypeIconStyles}>{archetype[0]}</div>
        <span style={{ fontWeight: 'bold' }}>{archetype}</span>
      </div>

      {/* Stamina Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div>Stamina</div>
        <div style={staminaBarStyles}>
          <div style={staminaFillStyles} />
        </div>
        <div style={{ minWidth: '30px', textAlign: 'right' }}>
          {Math.round(stamina)}
        </div>
      </div>

      {/* Signature Move Cooldown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div>{signatureData.name}</div>
        <div style={signatureCooldownStyles}>
          {cooldownPercent > 0 ? <div style={cooldownOverlayStyles} /> : null}
          <div style={{ position: 'relative', zIndex: 1 }}>E</div>
        </div>
      </div>

      {/* Lock-on Indicator */}
      {isLockingOn && (
        <div style={{ color: '#ff6', fontWeight: 'bold' }}>
          <div style={{ animation: 'pulse 1s infinite' }}>🎯 LOCKED</div>
        </div>
      )}

      {/* Wave Info */}
      {waveInfo && (
        <div style={{ marginLeft: 'auto' }}>
          Wave {waveInfo.current} • {waveInfo.enemiesLeft} enemies left
        </div>
      )}

      {/* Controls Hint */}
      <div style={controlsStyles}>
        WASD: Move • Shift: Dash • Ctrl: Block • Alt: Lock-on • E:{' '}
        {signatureData.name} • R: Reset
      </div>
    </div>
  );
};
