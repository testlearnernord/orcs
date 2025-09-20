import { describe, expect, it } from 'vitest';

import type { RelationEdge } from '@ui/overlay/RelationsOverlay';
import { selectEdgesForFocus } from '@ui/overlay/RelationsOverlay';

const ALL_TYPES = new Set<RelationEdge['type']>([
  'ally',
  'friend',
  'rival',
  'bloodoath',
  'hierarchy'
]);

describe('relations lens filtering', () => {
  const link = (map: Map<string, RelationEdge[]>, edge: RelationEdge): void => {
    map.set(edge.fromId, [...(map.get(edge.fromId) ?? []), edge]);
    map.set(edge.toId, [...(map.get(edge.toId) ?? []), edge]);
  };

  const createGraph = (): Map<string, RelationEdge[]> => {
    const edges: Record<string, RelationEdge> = {
      ac: { id: 'a:c', fromId: 'a', toId: 'c', type: 'rival', strength: 0.75 },
      ab: { id: 'a:b', fromId: 'a', toId: 'b', type: 'ally', strength: 0.65 },
      ad: { id: 'a:d', fromId: 'a', toId: 'd', type: 'friend', strength: 0.5 },
      be: { id: 'b:e', fromId: 'b', toId: 'e', type: 'ally', strength: 0.6 },
      bf: { id: 'b:f', fromId: 'b', toId: 'f', type: 'bloodoath', strength: 1 },
      cg: {
        id: 'c:g',
        fromId: 'c',
        toId: 'g',
        type: 'hierarchy',
        strength: 0.3
      }
    };
    const adjacency = new Map<string, RelationEdge[]>();
    link(adjacency, edges.ac);
    link(adjacency, edges.ab);
    link(adjacency, edges.ad);
    link(adjacency, edges.be);
    link(adjacency, edges.bf);
    link(adjacency, edges.cg);
    return adjacency;
  };

  it('limits edges according to density and adjacency ordering', () => {
    const adjacency = createGraph();
    const result = selectEdgesForFocus(adjacency, 'a', {
      activeTypes: ALL_TYPES,
      density: 2,
      includeSecondOrder: false
    });
    expect(result.map((edge) => edge.id)).toEqual(['a:c', 'a:b']);
  });

  it('honours type filters when selecting edges', () => {
    const adjacency = createGraph();
    const result = selectEdgesForFocus(adjacency, 'a', {
      activeTypes: new Set<RelationEdge['type']>(['ally']),
      density: 3,
      includeSecondOrder: false
    });
    expect(result.map((edge) => edge.id)).toEqual(['a:b']);
  });

  it('includes second order neighbors when enabled with caps', () => {
    const adjacency = createGraph();
    const result = selectEdgesForFocus(adjacency, 'a', {
      activeTypes: ALL_TYPES,
      density: 2,
      includeSecondOrder: true
    });
    expect(result.map((edge) => edge.id)).toEqual([
      'a:c',
      'a:b',
      'c:g',
      'b:e',
      'b:f'
    ]);
  });
});
