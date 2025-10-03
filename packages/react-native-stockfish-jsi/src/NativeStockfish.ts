import { NativeModules } from 'react-native';

declare const global: typeof globalThis;

const LINKING_ERROR =
  `react-native-stockfish-jsi: Native module not found. ` +
  `Did you create a custom dev client and reinstall the app?`;

// Helper to ensure JSI is installed
async function ensureJSIInstalled(): Promise<void> {
  const mod = (global as any).StockfishJSI;
  if (mod) {
    console.log('[NativeStockfish] JSI already installed ✅');
    return;
  }
  
  // Try to trigger installation via native module
  const nativeModule = NativeModules.StockfishJSI;
  if (nativeModule && nativeModule.install) {
    console.log('[NativeStockfish] Calling native install method...');
    try {
      await nativeModule.install();
      console.log('[NativeStockfish] Native install called');
      
      // Wait a bit for JSI to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const modAfter = (global as any).StockfishJSI;
      if (modAfter) {
        console.log('[NativeStockfish] JSI installed successfully ✅');
        return;
      }
    } catch (error) {
      console.warn('[NativeStockfish] Native install failed:', error);
    }
  }
  
  // If still not available, throw error
  const finalCheck = (global as any).StockfishJSI;
  if (!finalCheck) {
    throw new Error(LINKING_ERROR);
  }
}

const StockfishJSIResolver = () => {
  const mod = (global as any).StockfishJSI;
  if (!mod) throw new Error(LINKING_ERROR);
  return mod;
};

type Listener = (line: string) => void;

export class NativeStockfish {
  private listeners: Listener[] = [];
  private installed = false;

  async init(options: Record<string, any> = {}) {
    if (!this.installed) {
      await ensureJSIInstalled();
      this.installed = true;
    }
    
    const native = StockfishJSIResolver();
    native.install?.();
    native.setOnMessage?.((line: string) => {
      for (const listener of this.listeners) {
        listener(String(line));
      }
    });
    native.init?.(options);
  }

  send(command: string) {
    const native = StockfishJSIResolver();
    native.send?.(command);
  }

  onMessage(listener: Listener) {
    this.listeners.push(listener);
  }

  dispose() {
    const native = StockfishJSIResolver();
    native.dispose?.();
    this.listeners = [];
  }
}

