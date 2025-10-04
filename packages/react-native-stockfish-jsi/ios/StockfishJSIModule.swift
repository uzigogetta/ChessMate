import ExpoModulesCore

public class StockfishJSIModule: Module {
  private static var isInstalled = false
  
  public func definition() -> ModuleDefinition {
    Name("StockfishJSI")
    
    // Try to install as soon as the module is created
    OnCreate {
      self.tryInstall()
    }
    
    // Fallback that JS can call if needed
    Function("ensureInstalled") { () -> Bool in
      self.tryInstall()
      return Self.isInstalled
    }
  }
  
  private func tryInstall() {
    guard !Self.isInstalled else { return }
    
    // appContext.runtime is a throwing getter in SDK 54 -> use try?
    if let rtOpt = try? self.appContext?.runtime, let runtime = rtOpt {
      self.installJSI(runtime: runtime)
    } else {
      NSLog("⚠️ [StockfishJSIModule] JavaScript runtime not ready yet; will install on demand")
    }
  }
  
  private func installJSI(runtime: JavaScriptRuntime) {
    NSLog("🟢 [StockfishJSIModule] Installing JSI bindings via Expo Module...")
    
    // Thanks to NS_SWIFT_NAME, this is now install(runtime:)
    StockfishJSIShim.install(runtime: runtime)
    
    Self.isInstalled = true
    NSLog("🟢 [StockfishJSIModule] ✅ JSI bindings installed successfully!")
  }
}

