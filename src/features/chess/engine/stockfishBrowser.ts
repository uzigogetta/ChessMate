// Prefer the lite single-threaded JS build (no WASM worker) to avoid double-worker overhead.
// This variant is synchronous but returns an emulated worker interface compatible with our engine wrapper.
import './wasmStub';

let cachedFactory: any | null = null;

export async function createBrowserStockfish() {
  if (!cachedFactory) {
    // Use the pure asm.js build (no WASM code paths at all)
    const module = await import('stockfish/src/stockfish-17.1-asm-341ff22.js');
    const factory = (module as any).default ?? (module as any);
    
    let cachedModule: any = null;
    let cachedWrapper: any = null;
    
    cachedFactory = async () => {
      // Return the same wrapper instance to avoid duplicate initializations
      if (cachedWrapper) return cachedWrapper;
      
      if (!cachedModule) {
        const moduleOrPromise = factory();
        cachedModule = typeof moduleOrPromise?.then === 'function' ? await moduleOrPromise : moduleOrPromise;
      }
      
      const sfModule = cachedModule;
      
      // Emscripten Module doesn't have postMessage—create a worker-like wrapper
      const wrapper: any = {
        onmessage: null,
        onerror: null,
        postMessage: (cmd: string) => {
          if (sfModule && sfModule.ccall) {
            try {
              sfModule.ccall('command', null, ['string'], [cmd], { async: false });
            } catch (err) {
              console.warn('[stockfish-wrapper] ccall failed', err);
            }
          }
        },
        terminate: () => {
          // no-op for asm.js
        },
      };
      
      // Capture Stockfish output via Module.print
      if (sfModule) {
        sfModule.print = (line: string) => {
          if (wrapper.onmessage) {
            wrapper.onmessage({ data: line });
          }
        };
        sfModule.printErr = (line: string) => {
          // Suppress WASM/init noise, pass through UCI output
          if (!line.includes('Stockfish') && !line.includes('ASM.JS') && !line.includes('AUTHORS')) {
            if (wrapper.onmessage) {
              wrapper.onmessage({ data: line });
            }
          }
        };
      }
      
      cachedWrapper = wrapper;
      return wrapper;
    };
  }
  return cachedFactory;
}
