import { NativeModules } from 'react-native';

declare const global: typeof globalThis;

const LINKING_ERROR =
  `react-native-stockfish-jsi: Native module not found. ` +
  `Did you create a custom dev client and reinstall the app?`;

// Install JSI bindings via the installer module (New Architecture compatible)
let installAttempted = false;

async function ensureJSIInstalled(): Promise<void> {
  // Check if already installed
  const mod = (global as any).StockfishJSI;
  if (mod) {
    console.log('[NativeStockfish] ✅ JSI already installed');
    return;
  }
  
  // Only try installation once
  if (!installAttempted) {
    installAttempted = true;
    
    // Use the installer module (RuntimeExecutor-based, New Arch compatible)
    const installer = NativeModules.StockfishJSIInstaller;
    if (installer && installer.install) {
      console.log('[NativeStockfish] 🟢 Calling StockfishJSIInstaller.install()...');
      try {
        await installer.install();
        console.log('[NativeStockfish] 🟢 Installer called successfully');
        
        // Give it a moment to install
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if it worked
        const modAfter = (global as any).StockfishJSI;
        if (modAfter) {
          console.log('[NativeStockfish] ✅ JSI installed successfully!');
          return;
        } else {
          console.warn('[NativeStockfish] ⚠️ Installer called but JSI not available yet');
        }
      } catch (error) {
        console.error('[NativeStockfish] ❌ Installer failed:', error);
      }
    } else {
      console.warn('[NativeStockfish] ⚠️ StockfishJSIInstaller module not found');
    }
  }
  
  // Final check
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

