import ExpoModulesCore

public class StockfishJSIModule: Module {
  private static var isInstalled = false

  public func definition() -> ModuleDefinition {
    Name("StockfishJSI")

    OnCreate { [weak self] in
      self?.tryInstall()
    }

    // JS can call this once at startup; returns true if installed already.
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
      NSLog("⚠️ [StockfishJSIModule] JS runtime not ready yet; will install on demand")
    }
  }

  private func installJSI(runtime: JavaScriptRuntime) {
    // Thanks to NS_SWIFT_NAME, this is now install(runtime:)
    StockfishJSIShim.install(runtime: runtime)
    Self.isInstalled = true
    NSLog("🟢 [StockfishJSIModule] ✅ JSI bindings installed successfully!")
  }
}

