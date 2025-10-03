import { NativeModules } from 'react-native';

declare const global: typeof globalThis;

const LINKING_ERROR =
  `react-native-stockfish-jsi: Native module not found. ` +
  `Did you create a custom dev client and reinstall the app?`;

// Trigger JSI installation via RuntimeExecutor
function ensureJSIInstalled(): void {
  const mod = (global as any).StockfishJSI;
  if (mod) {
    console.log('[NativeStockfish] ✅ JSI already installed');
    return;
  }
  
  const installer = NativeModules.StockfishJSIInstaller;
  if (!installer || !installer.install) {
    console.warn('[NativeStockfish] ⚠️ Installer module not found');
    throw new Error(LINKING_ERROR);
  }
  
  console.log('[NativeStockfish] 🟢 Calling installer.install() (RuntimeExecutor-based)...');
  installer.install();
  console.log('[NativeStockfish] 🟢 Installation scheduled on JS thread via RuntimeExecutor');
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
      ensureJSIInstalled();
      // Give RuntimeExecutor time to install (async)
      await new Promise(resolve => setTimeout(resolve, 200));
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

