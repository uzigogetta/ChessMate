import React from 'react';
import { useSharedValue, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { SPEEDS, ease, landEase, PIECE_LIFT, INVALID_SHAKE, CAPTURE_MS } from './animConfig';
import { useSettings } from '@/features/settings/settings.store';

export type XY = { x: number; y: number };

export function usePieceAnimator(pieceId: string) {
  const speed = useSettings((s) => ((s as any).animationSpeed as any) || 'normal');
  const enabled = useSettings((s) => ((s as any).reduceMotion ? false : true));
  const dur = SPEEDS[(speed as any) in SPEEDS ? (speed as any) : 'normal'];

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const z = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const instantTo = React.useCallback(
    (p: XY) => {
      tx.value = p.x;
      ty.value = p.y;
      z.value = 0;
      scale.value = 1;
      opacity.value = 1;
    },
    [tx, ty, z, scale, opacity]
  );

  const moveTo = React.useCallback(
    (p: XY, onEnd?: () => void) => {
      if (!enabled) {
        instantTo(p);
        onEnd?.();
        return;
      }
      z.value = withTiming(PIECE_LIFT, { duration: Math.max(60, dur * 0.25), easing: ease }, () => {
        tx.value = withTiming(p.x, { duration: dur, easing: ease });
        ty.value = withTiming(p.y, { duration: dur, easing: ease }, () => {
          z.value = withTiming(0, { duration: Math.max(80, dur * 0.35), easing: landEase }, () =>
            onEnd && runOnJS(onEnd)()
          );
        });
      });
    },
    [enabled, dur, instantTo, tx, ty, z]
  );

  const captureFade = React.useCallback(
    (onGone?: () => void) => {
      opacity.value = withTiming(0, { duration: CAPTURE_MS, easing: Easing.linear }, () =>
        onGone && runOnJS(onGone)()
      );
      scale.value = withTiming(0.85, { duration: CAPTURE_MS });
    },
    [opacity, scale]
  );

  const dragStart = React.useCallback(() => {
    z.value = withTiming(PIECE_LIFT, { duration: 90 });
    scale.value = withTiming(1.06, { duration: 90 });
  }, [z, scale]);

  const dragEnd = React.useCallback(() => {
    z.value = withTiming(0, { duration: 120 });
    scale.value = withTiming(1, { duration: 120 });
  }, [z, scale]);

  const invalidShake = React.useCallback(() => {
    const base = tx.value;
    const { dx, cycles, totalMs } = INVALID_SHAKE;
    const per = Math.max(12, totalMs / (cycles * 2));
    let i = 0;
    const step = () => {
      const dir = i % 2 === 0 ? -dx : dx;
      tx.value = withTiming(base + dir, { duration: per }, () => {
        i++;
        if (i < cycles * 2) step();
        else tx.value = withTiming(base, { duration: per });
      });
    };
    step();
  }, [tx]);

  return React.useMemo(
    () => ({
      tx,
      ty,
      z,
      scale,
      opacity,
      moveTo,
      instantTo,
      captureFade,
      dragStart,
      dragEnd,
      invalidShake,
      dur,
    }),
    [tx, ty, z, scale, opacity, moveTo, instantTo, captureFade, dragStart, dragEnd, invalidShake, dur]
  );
}
