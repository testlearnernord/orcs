import { EventBus } from '@state/eventBus';

export type GameMode = 'spectate' | 'player' | 'freeRoam';

export interface UIModeState {
  mode: GameMode;
  playerId: string | null;
}

interface UIModeEvents extends Record<string, UIModeState> {
  'mode:changed': UIModeState;
}

function normalizeState(state: UIModeState): UIModeState {
  if (state.mode !== 'player') {
    return { mode: state.mode, playerId: null };
  }
  return state;
}

export class UIModeStore extends EventBus<UIModeEvents> {
  private state: UIModeState = { mode: 'freeRoam', playerId: null };

  getState(): UIModeState {
    return this.state;
  }

  setMode(mode: GameMode, playerId: string | null = this.state.playerId): void {
    const next = normalizeState({ mode, playerId });
    if (
      this.state.mode === next.mode &&
      this.state.playerId === next.playerId
    ) {
      return;
    }
    this.state = next;
    this.emit('mode:changed', this.state);
  }

  setPlayer(playerId: string | null): void {
    const next = normalizeState({ mode: this.state.mode, playerId });
    if (
      this.state.playerId === next.playerId &&
      this.state.mode === next.mode
    ) {
      return;
    }
    this.state = next;
    this.emit('mode:changed', this.state);
  }
}
