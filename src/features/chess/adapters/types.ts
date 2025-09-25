export type BoardCorePropsLike = any; // Placeholder until full migration

export type GameAdapter = {
  getBoardProps(): BoardCorePropsLike;
  offerDraw(): void;
  resign(): void;
  requestRematch(): void;
  dispose(): void;
};


