import { useAnimRegistry } from './AnimRegistry';
import type { XY } from './usePieceAnimator';
import { haptics } from './haptics';

export type MoveResolution = {
  moverId: string;
  toPixel: XY;
  captureId?: string;
  isCheck?: boolean;
  isMate?: boolean;
  isPromotion?: { newId: string; newSpriteUri: any } | null;
  onApplyMove(): void;
  onRemoveCaptured?(): void;
  onFinish?(): void;
};

export function useMoveResolver() {
  const reg = useAnimRegistry();

  function play(move: MoveResolution) {
    const mover = reg.get(move.moverId);
    if (!mover) {
      if (move.captureId) {
        move.onRemoveCaptured?.();
        haptics.capture();
      }
      move.onApplyMove?.();
      if (move.isMate) haptics.win();
      else if (move.isCheck) haptics.check();
      else haptics.move();
      move.onFinish?.();
      return;
    }

    const doMove = () => {
      mover.moveTo(move.toPixel, () => {
        move.onApplyMove?.();
        if (move.isMate) haptics.win();
        else if (move.isCheck) haptics.check();
        else haptics.move();
        move.onFinish?.();
      });
    };

    if (move.captureId) {
      const victim = reg.get(move.captureId);
      if (victim) {
        victim.captureFade(() => {
          move.onRemoveCaptured?.();
          haptics.capture();
          doMove();
        });
      } else {
        move.onRemoveCaptured?.();
        haptics.capture();
        doMove();
      }
    } else {
      doMove();
    }
  }

  function invalid(pieceOrSquare: string) {
    if (!pieceOrSquare) return;
    let target = reg.get(pieceOrSquare);
    if (!target && !pieceOrSquare.includes('@')) {
      const suffix = '@' + pieceOrSquare;
      reg.forEach((anim) => {
        if (!target && anim.id.endsWith(suffix)) {
          target = anim;
        }
      });
    }
    target?.invalidShake();
  }

  return { play, invalid };
}
