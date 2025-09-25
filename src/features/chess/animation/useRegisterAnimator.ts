import React from 'react';
import type { PieceAnimatorAPI } from './AnimRegistry';
import { useAnimRegistry } from './AnimRegistry';

export function useRegisterAnimator(api: PieceAnimatorAPI) {
  const reg = useAnimRegistry();
  React.useLayoutEffect(() => {
    reg.register(api);
    return () => reg.unregister(api.id);
  }, [reg, api]);
}



