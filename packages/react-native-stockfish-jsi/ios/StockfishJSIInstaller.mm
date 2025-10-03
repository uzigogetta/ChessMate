#import "StockfishJSIInstaller.h"
#import <React/RCTLog.h>
#import <React/RCTCxxBridge+Private.h>
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
    
    // 2) For Old Architecture: get runtime from CxxBridge
    if (!executor && _bridge) {
        RCTCxxBridge *cxxBridge = (RCTCxxBridge *)_bridge;
        if (cxxBridge && [cxxBridge respondsToSelector:@selector(runtime)]) {
            RCTLogInfo(@"🟡 [StockfishJSIInstaller] Using CxxBridge runtime (Old Arch)");
            auto runtime = (jsi::Runtime *)cxxBridge.runtime;
            if (runtime) {
                installStockfish(*runtime);
                s_installed = true;
                RCTLogInfo(@"🟢 [StockfishJSIInstaller] ✅ JSI bindings installed successfully!");
                return;
            }
        }
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

