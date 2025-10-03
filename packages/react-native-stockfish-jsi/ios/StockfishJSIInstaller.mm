#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <ReactCommon/RuntimeExecutor.h>
#import <jsi/jsi.h>

using namespace facebook;
using namespace facebook::react;

// Forward declaration from StockfishJSI.cpp
extern "C" void installStockfish(jsi::Runtime& rt);

// Protocol for runtime executor (New Architecture)
@protocol RCTRuntimeExecutorModule <NSObject>
@property (nonatomic, readonly) RuntimeExecutor runtimeExecutor;
@end

@interface StockfishJSIInstaller : NSObject <RCTBridgeModule, RCTRuntimeExecutorModule>
@end

@implementation StockfishJSIInstaller {
    BOOL _installed;
}

RCT_EXPORT_MODULE();

// Synthesize the runtime executor (injected by React Native)
@synthesize runtimeExecutor = _runtimeExecutor;

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

// Called when module is initialized - install JSI bindings here!
- (void)initialize {
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] initialize() called");
    
    if (_installed) {
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Already installed, skipping");
        return;
    }
    
    RuntimeExecutor executor = _runtimeExecutor;
    if (!executor) {
        RCTLogError(@"🔴 [StockfishJSIInstaller] RuntimeExecutor not available");
        return;
    }
    
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] Installing JSI via RuntimeExecutor...");
    
    // Execute on JS thread via RuntimeExecutor (New Arch official way)
    executor([=](jsi::Runtime& runtime) {
        @try {
            RCTLogInfo(@"🟢 [StockfishJSIInstaller] Running on JS thread, installing bindings...");
            installStockfish(runtime);
            RCTLogInfo(@"🟢 [StockfishJSIInstaller] ✅ JSI bindings installed successfully!");
        } @catch (NSException *exception) {
            RCTLogError(@"🔴 [StockfishJSIInstaller] Failed: %@", exception.reason);
        }
    });
    
    _installed = YES;
}

@end

