/**
 * Lock-on marker that appears over targeted enemies
 */

import React from 'react';
import type { Point2D } from '../../combat/hitbox';

export interface LockOnMarkerProps {
  targetPosition: Point2D;
  cameraPosition: Point2D;
  screenCenter: Point2D;
  isActive: boolean;
}

export const LockOnMarker: React.FC<LockOnMarkerProps> = ({
  targetPosition,
  cameraPosition,
  screenCenter,
  isActive
}) => {
  if (!isActive) return null;

  // Convert world position to screen position
  const screenX = screenCenter.x + (targetPosition.x - cameraPosition.x) * 50; // Scale factor
  const screenY = screenCenter.y + (targetPosition.y - cameraPosition.y) * 50;

  const markerStyles: React.CSSProperties = {
    position: 'fixed',
    width: '50px',
    height: '50px',
    pointerEvents: 'none',
    zIndex: 999,
    left: screenX - 25, // Center the 50px marker
    top: screenY - 25
  };

  const ringStyles: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '2px solid #ff6',
    borderRadius: '50%',
    animation: 'lockon-pulse 1.5s infinite ease-in-out'
  };

  const centerStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '4px',
    height: '4px',
    background: '#ff6',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)'
  };

  return (
    <div style={markerStyles}>
      <div style={ringStyles} />
      <div style={centerStyles} />
      
      <style>{`
        @keyframes lockon-pulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.8);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Multiple markers for showing all potential targets
 */
export interface MultiLockOnMarkersProps {
  targets: Array<{
    id: string;
    position: Point2D;
    isLocked: boolean;
  }>;
  cameraPosition: Point2D;
  screenCenter: Point2D;
}

export const MultiLockOnMarkers: React.FC<MultiLockOnMarkersProps> = ({
  targets,
  cameraPosition,
  screenCenter
}) => {
  return (
    <>
      {targets.map(target => (
        <LockOnMarker
          key={target.id}
          targetPosition={target.position}
          cameraPosition={cameraPosition}
          screenCenter={screenCenter}
          isActive={target.isLocked}
        />
      ))}
    </>
  );
};