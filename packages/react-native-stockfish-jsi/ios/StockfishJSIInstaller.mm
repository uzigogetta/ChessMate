#import "StockfishJSIInstaller.h"
#import <React/RCTLog.h>
#import <jsi/jsi.h>

using namespace facebook;
using namespace facebook::react;

// Your C++ binder that sets global.StockfishJSI
extern "C" void installStockfish(jsi::Runtime& rt);

@implementation StockfishJSIInstaller

RCT_EXPORT_MODULE(StockfishJSIInstaller);

// RN injects both of these
@synthesize runtimeExecutor = _runtimeExecutor;
@synthesize bridge = _bridge;

static bool s_installed = false;

- (void)setBridge:(RCTBridge *)bridge {
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] setBridge called");
    _bridge = bridge;
}

RCT_EXPORT_METHOD(install)
{
    if (s_installed) {
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Already installed, skipping");
        return;
    }
    
    // 1) Prefer executor injected via RCTRuntimeExecutorModule
    RuntimeExecutor executor = _runtimeExecutor;
    
    // 2) Fallback: ask the bridge for its executor (works in Expo/RN 0.81)
    if (!executor && _bridge) {
        RCTLogInfo(@"🟡 [StockfishJSIInstaller] Using bridge.runtimeExecutor fallback");
        executor = _bridge.runtimeExecutor;
    }
    
    if (!executor) {
        RCTLogWarn(@"⚠️ [StockfishJSIInstaller] RuntimeExecutor not available yet; retrying in 70ms");
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 70 * NSEC_PER_MSEC),
                       dispatch_get_main_queue(), ^{
                           [self install];
                       });
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

