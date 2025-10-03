import { NativeModules } from 'react-native';

declare const global: typeof globalThis;

const LINKING_ERROR =
  `react-native-stockfish-jsi: Native module not found. ` +
  `Did you create a custom dev client and reinstall the app?`;

// Auto-install happens in native initialize() method (RuntimeExecutor-based)
// Just wait for it to be available
async function ensureJSIInstalled(): Promise<void> {
  const mod = (global as any).StockfishJSI;
  if (mod) {
    console.log('[NativeStockfish] ✅ JSI already installed');
    return;
  }
  
  // Trigger module load by accessing it
  const installer = NativeModules.StockfishJSIInstaller;
  if (!installer) {
    console.warn('[NativeStockfish] ⚠️ Installer module not found');
    throw new Error(LINKING_ERROR);
  }
  
  console.log('[NativeStockfish] 🟢 Installer module loaded, waiting for JSI...');
  
  // Wait for auto-installation to complete (happens in native initialize())
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const check = (global as any).StockfishJSI;
    if (check) {
      console.log('[NativeStockfish] ✅ JSI installed via RuntimeExecutor!');
      return;
    }
  }
  
  // Still not available after 2 seconds
  console.error('[NativeStockfish] ❌ JSI not installed after 2s timeout');
  throw new Error(LINKING_ERROR);
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

