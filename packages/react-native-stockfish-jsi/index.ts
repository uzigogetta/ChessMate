import { requireNativeModule } from 'expo-modules-core';

const Native = requireNativeModule<{ ensureInstalled: () => boolean }>('StockfishJSI');

export function bootStockfishJSI() {
  try { Native.ensureInstalled(); } catch {}
}

export { NativeStockfish } from './src/NativeStockfish';
