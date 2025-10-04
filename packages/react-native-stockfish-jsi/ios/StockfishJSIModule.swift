import ExpoModulesCore

public class StockfishJSIModule: Module {
  private static var isInstalled = false

  public func definition() -> ModuleDefinition {
    Name("StockfishJSI")

    // JS calls this once at startup. Expo passes the JavaScriptRuntime for us.
    Function("ensureInstalled") { (runtime: JavaScriptRuntime) -> Bool in
      if Self.isInstalled { return true }
      StockfishJSIShim.install(runtime: runtime)   // Swift name we created
      Self.isInstalled = true
      NSLog("🟢 [StockfishJSIModule] JSI bindings installed")
      return true
    }
  }
}

