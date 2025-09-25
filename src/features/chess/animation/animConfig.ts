import { Easing } from 'react-native-reanimated';

export type AnimSpeed = 'snappy' | 'normal' | 'cozy';

export const SPEEDS: Record<AnimSpeed, number> = {
  snappy: 120,
  normal: 170,
  cozy: 230,
};

export const ease = Easing.bezier(0.2, 0.0, 0.2, 1);
export const landEase = Easing.bezier(0.1, 0.9, 0.2, 1);
export const PIECE_LIFT = 5;
export const INVALID_SHAKE = { dx: 6, cycles: 3, totalMs: 150 };
export const CAPTURE_MS = 120;


