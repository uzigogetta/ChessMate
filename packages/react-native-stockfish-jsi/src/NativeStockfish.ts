import { NativeModules } from 'react-native';

declare const global: typeof globalThis;

const LINKING_ERROR =
  `react-native-stockfish-jsi: Native module not found. ` +
  `Did you create a custom dev client and reinstall the app?`;

// Helper to get JSI object (lazy)
function getJSI(): any | undefined {
  return (global as any).StockfishJSI;
}

// Ensure JSI is installed and wait for it to be available
export async function ensureJSIInstalled(timeoutMs = 5000): Promise<void> {
  // Already installed?
  if (getJSI()) {
    console.log('[NativeStockfish] ✅ JSI already installed');
    return;
  }
  
  // Trigger installation
  const installer = NativeModules.StockfishJSIInstaller;
  if (!installer || !installer.install) {
    throw new Error(LINKING_ERROR);
  }
  
  console.log('[NativeStockfish] 🟢 Calling installer.install() (RuntimeExecutor-based with bridge fallback)...');
  installer.install();  // Schedules async install on JS thread (idempotent)
  
  // Poll for global to appear (installer runs async)
  const start = Date.now();
  while (!getJSI()) {
    if (Date.now() - start > timeoutMs) {
      console.error('[NativeStockfish] ❌ JSI not installed after timeout');
      throw new Error('react-native-stockfish-jsi: JSI not installed in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));  // Poll every 25ms
  }
  
  console.log('[NativeStockfish] ✅ JSI installed successfully!');
}

type Listener = (line: string) => void;

export class NativeStockfish {
  private listeners: Listener[] = [];
  private api: any | null = null;

  async init(options: Record<string, any> = {}) {
    // Wait for JSI to be installed
    if (!this.api) {
      await ensureJSIInstalled();
      this.api = getJSI();
      if (!this.api) {
        throw new Error(LINKING_ERROR);
      }
    }
    
    const native = this.api;
    native.install?.();
    native.setOnMessage?.((line: string) => {
      for (const listener of this.listeners) {
        listener(String(line));
      }
    });
    native.init?.(options);
  }

  send(command: string) {
    if (!this.api) throw new Error('Engine not initialized');
    this.api.send?.(command);
  }

  onMessage(listener: Listener) {
    this.listeners.push(listener);
  }

  dispose() {
    if (this.api) {
      this.api.dispose?.();
    }
    this.api = null;
    this.listeners = [];
  }
}

