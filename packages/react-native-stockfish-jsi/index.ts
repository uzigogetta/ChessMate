import { requireNativeModule } from 'expo-modules-core';

const Native = requireNativeModule<{ ensureInstalled: () => boolean }>('StockfishJSI');

export function bootStockfishJSI() {
  try {
    Native.ensureInstalled(); // returns true/false, safe to call repeatedly
  } catch (e) {
    console.warn('[StockfishJSI] ensureInstalled failed:', e);
  }
}

export { NativeStockfish } from './src/NativeStockfish';
