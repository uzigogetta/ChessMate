import React from 'react';

export type XY = { x: number; y: number };

export type PieceAnimatorAPI = {
  id: string;
  instantTo(p: XY): void;
  moveTo(p: XY, onEnd?: () => void): void;
  captureFade(onGone?: () => void): void;
  dragStart(): void;
  dragEnd(): void;
  invalidShake(): void;
};

type Registry = Map<string, PieceAnimatorAPI>;
type Ctx = {
  register(anim: PieceAnimatorAPI): void;
  unregister(id: string): void;
  get(id: string): PieceAnimatorAPI | undefined;
  has(id: string): boolean;
  forEach(cb: (anim: PieceAnimatorAPI) => void): void;
};

const AnimRegistryContext = React.createContext<Ctx | null>(null);

export const AnimRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = React.useRef<Registry>(new Map());

  const ctx = React.useMemo<Ctx>(() => ({
    register(anim) { ref.current.set(anim.id, anim); },
    unregister(id) { ref.current.delete(id); },
    get(id) { return ref.current.get(id); },
    has(id) { return ref.current.has(id); },
    forEach(cb) { ref.current.forEach(cb); },
  }), []);

  return <AnimRegistryContext.Provider value={ctx}>{children}</AnimRegistryContext.Provider>;
};

export function useAnimRegistry(): Ctx {
  const ctx = React.useContext(AnimRegistryContext);
  if (ctx) return ctx;
  // Fallback no-op registry for places rendering BoardSkia without a provider (e.g., Archive mini boards)
  const fallbackRef: { current: Map<string, PieceAnimatorAPI> | null } = (useAnimRegistry as any)._fallbackRef || { current: null };
  if (!fallbackRef.current) fallbackRef.current = new Map();
  (useAnimRegistry as any)._fallbackRef = fallbackRef;
  const map = fallbackRef.current;
  return {
    register(anim) { map.set(anim.id, anim); },
    unregister(id) { map.delete(id); },
    get(id) { return map.get(id); },
    has(id) { return map.has(id); },
    forEach(cb) { map.forEach(cb); },
  };
}


