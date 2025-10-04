import ExpoModulesCore

public class StockfishJSIModule: Module {
  private static var isInstalled = false
  
  public func definition() -> ModuleDefinition {
    Name("StockfishJSIModule")
    
    OnCreate {
      // Check if runtime is already available
      if let runtime = appContext?.runtime {
        installJSIBindings(runtime: runtime)
      }
      
      // Subscribe to runtime availability (for bridgeless mode)
      appContext?.runtimeManager?.onRuntimeAvailable { [weak self] runtime in
        self?.installJSIBindings(runtime: runtime)
      }
    }
    
    // Optional: manual trigger from JS (idempotent)
    Function("install") {
      if let runtime = appContext?.runtime {
        installJSIBindings(runtime: runtime)
      }
    }
  }
  
  private func installJSIBindings(runtime: JavaScriptRuntime) {
    guard !Self.isInstalled else {
      NSLog("🟢 [StockfishJSIModule] Already installed, skipping")
      return
    }
    
    NSLog("🟢 [StockfishJSIModule] Installing JSI bindings via Expo Module...")
    
    // Call ObjC++ shim to install C++ bindings
    StockfishJSIShim.install(withRuntime: runtime.runtime)
    
    Self.isInstalled = true
    NSLog("🟢 [StockfishJSIModule] ✅ JSI bindings installed successfully!")
  }
}

