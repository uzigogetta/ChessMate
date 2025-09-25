// Sound mapping placeholder. Replace nulls with require() of your files when available, e.g.:
// export const SND = {
//   move: require('./move.mp3'),
//   capture: require('./capture.mp3'),
//   check: require('./check.mp3'),
//   game_end: require('./game_end.mp3'),
// } as const;

export const SND = {
  move: require('./move.mp3'),
  capture: require('./capture.mp3'),
  check: null as any,
  game_start: require('./boardstart.mp3'),
  game_end: null as any,
} as const;


