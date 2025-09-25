import { useMoveResolver } from '../animation/MoveResolver';
import type { GameAdapter } from './types';

// Minimal adapter skeleton – will be expanded in subsequent phases
export class LocalAdapter implements GameAdapter {
  private getBoardPropsRef: () => any;

  constructor(getBoardProps: () => any) {
    this.getBoardPropsRef = getBoardProps;
  }

  getBoardProps() {
    return this.getBoardPropsRef();
  }

  offerDraw() {}
  resign() {}
  requestRematch() {}
  dispose() {}
}


