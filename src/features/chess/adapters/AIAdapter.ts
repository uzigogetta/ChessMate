import type { GameAdapter } from './types';

export class AIAdapter implements GameAdapter {
  private getBoardPropsRef: () => any;
  constructor(getBoardProps: () => any) { this.getBoardPropsRef = getBoardProps; }
  getBoardProps() { return this.getBoardPropsRef(); }
  offerDraw() {}
  resign() {}
  requestRematch() {}
  dispose() {}
}


