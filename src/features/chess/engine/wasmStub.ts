// Install WebAssembly stub globally to force Stockfish to use asm.js
if (typeof globalThis.WebAssembly === 'undefined') {
  const failSilently = () => ({ instance: null, module: null });
  
  (globalThis as any).WebAssembly = {
    validate: () => false,
    compile: async () => null,
    instantiate: async () => failSilently(),
    compileStreaming: async () => null,
    instantiateStreaming: async () => failSilently(),
    Module: function() { return null; },
    Instance: function() { return null; },
    Memory: function() { return null; },
    Table: function() { return null; },
  };
}

// Prevent Stockfish from trying to fetch anything
if (typeof globalThis.fetch === 'undefined') {
  (globalThis as any).fetch = () => Promise.reject(new Error('fetch disabled'));
}

export {};

