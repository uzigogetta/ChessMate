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
    
    if let runtime = self.appContext?.runtime {
      self.installJSI(runtime: runtime)
    } else {
      NSLog("⚠️ [StockfishJSIModule] JavaScript runtime not ready yet; will install on demand")
    }
  }
  
  private func installJSI(runtime: JavaScriptRuntime) {
    NSLog("🟢 [StockfishJSIModule] Installing JSI bindings via Expo Module...")
    
    // Pass the JavaScriptRuntime wrapper directly to the ObjC++ shim
    StockfishJSIShim.install(withRuntime: runtime)
    
    Self.isInstalled = true
    NSLog("🟢 [StockfishJSIModule] ✅ JSI bindings installed successfully!")
  }
}

