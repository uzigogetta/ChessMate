#import "StockfishJSIInstaller.h"
#import <React/RCTLog.h>
#import <jsi/jsi.h>

using namespace facebook;
using namespace facebook::react;

// Your C++ binder that sets global.StockfishJSI
extern "C" void installStockfish(jsi::Runtime& rt);

@implementation StockfishJSIInstaller

RCT_EXPORT_MODULE(StockfishJSIInstaller);

@synthesize runtimeExecutor = _runtimeExecutor; // Injected by React Native

static bool s_installed = false;

RCT_EXPORT_METHOD(install)
{
    if (s_installed) {
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Already installed, skipping");
        return;
    }
    
    auto executor = _runtimeExecutor;
    if (!executor) {
        RCTLogError(@"🔴 [StockfishJSIInstaller] RuntimeExecutor not available");
        return;
    }

    RCTLogInfo(@"🟢 [StockfishJSIInstaller] Scheduling JSI install via RuntimeExecutor...");
    
    executor([=](jsi::Runtime& rt) {
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Running on JS thread, installing bindings...");
        installStockfish(rt);  // Sets global.StockfishJSI
        s_installed = true;
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] ✅ JSI bindings installed successfully!");
    });
}

@end

