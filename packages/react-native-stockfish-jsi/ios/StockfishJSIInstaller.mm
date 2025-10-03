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

// Exported method to trigger installation from JavaScript
RCT_EXPORT_METHOD(install:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] install() called from JavaScript!");
    
    if (_installed) {
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Already installed");
        resolve(@{@"success": @YES, @"alreadyInstalled": @YES});
        return;
    }
    
    RuntimeExecutor executor = _runtimeExecutor;
    if (!executor) {
        RCTLogError(@"🔴 [StockfishJSIInstaller] RuntimeExecutor not available");
        reject(@"NO_EXECUTOR", @"RuntimeExecutor not available", nil);
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
            RCTLogError(@"🔴 [StockfishJSIInstaller] Installation failed: %@", exception.reason);
        }
    });
    
    _installed = YES;
    
    // Resolve immediately - installation happens async via executor
    resolve(@{@"success": @YES});
}

@end

