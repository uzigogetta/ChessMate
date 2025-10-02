import type { SearchCapableEngine, EngineInitOptions } from './engine.types';
import { StockfishEngine } from './stockfish.engine';
import { MockEngine } from './engine.mock';
import { useEngineSettings } from './engineSettings.store';

type RuntimeMode = 'native' | 'browser' | 'mock';

let activeEngine: SearchCapableEngine | null = null;
let activeMode: RuntimeMode = 'browser';

async function createNativeEngine(): Promise<SearchCapableEngine | null> {
  try {
    const native = await import('@uzigogetta/react-native-stockfish-jsi');
    const EngineCtor = native.NativeStockfish ?? native.default;
    if (!EngineCtor) return null;
    return new EngineCtor() as SearchCapableEngine;
  } catch (error) {
    console.warn('[EngineManager] Native Stockfish unavailable', error);
    return null;
  }
}

function createBrowserEngine(): SearchCapableEngine {
  return new StockfishEngine();
}

function createMockEngine(): SearchCapableEngine {
  return new MockEngine() as unknown as SearchCapableEngine;
}

async function buildEngineForMode(preferred: 'native' | 'browser' | 'auto'): Promise<{ engine: SearchCapableEngine; mode: RuntimeMode }> {
  if (preferred === 'native') {
    const native = await createNativeEngine();
    if (native) {
      return { engine: native, mode: 'native' };
    }
    console.warn('[EngineManager] Native mode selected but unavailable, using browser fallback');
  }

  if (preferred !== 'browser') {
    const native = await createNativeEngine();
    if (native) {
      return { engine: native, mode: 'native' };
    }
  }

  try {
    return { engine: createBrowserEngine(), mode: 'browser' };
  } catch (error) {
    console.error('[EngineManager] Browser Stockfish failed, using mock engine', error);
    return { engine: createMockEngine(), mode: 'mock' };
  }
}

export async function getEngine(): Promise<{ engine: SearchCapableEngine; mode: RuntimeMode }> {
  if (activeEngine) {
    return { engine: activeEngine, mode: activeMode };
  }

  const settings = useEngineSettings.getState();
  const preferred = settings.mode ?? 'auto';
  const { engine, mode } = await buildEngineForMode(preferred);
  activeEngine = engine;
  activeMode = mode;
  return { engine, mode };
}

export async function initEngine(opts?: EngineInitOptions) {
  const { engine, mode } = await getEngine();
  await engine.init(opts);
  activeMode = mode;
  return { engine, mode };
}

export function resetEngine() {
  if (activeEngine) {
    try {
      activeEngine.dispose();
    } catch (error) {
      console.warn('[EngineManager] dispose failed', error);
    }
  }
  activeEngine = null;
  activeMode = 'browser';
}

export async function configureEngineWithSettings() {
  const settings = useEngineSettings.getState();
  
  // If engine exists and mode is compatible, just reconfigure
  if (activeEngine && (settings.mode === 'auto' || settings.mode === activeMode || (settings.mode === 'native' && activeMode === 'browser'))) {
    try {
      await activeEngine.init(settings);
      return { engine: activeEngine, mode: activeMode };
    } catch (error) {
      console.warn('[EngineManager] re-init failed, rebuilding', error);
    }
  }
  
  // Need a new engine (mode changed or first load)
  resetEngine();
  const { engine, mode } = await initEngine(settings);
  return { engine, mode };
}

export async function configureEngineDefaults() {
  const settings = useEngineSettings.getState();
  const { engine } = await initEngine(settings);
  return engine;
}

