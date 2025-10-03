#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <jsi/jsi.h>

using namespace facebook;

// Forward declaration from StockfishJSI.cpp
extern "C" void installStockfish(jsi::Runtime& rt);

@interface StockfishJSIInstaller : NSObject <RCTBridgeModule>
@property (nonatomic, weak) RCTBridge *bridge;
@end

@implementation StockfishJSIInstaller

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (void)setBridge:(RCTBridge *)bridge {
    self.bridge = bridge;
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] Bridge set, ready to install");
}

RCT_EXPORT_METHOD(install)
{
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] install() called from JavaScript!");
    
    if (!self.bridge) {
        RCTLogError(@"🔴 [StockfishJSIInstaller] Bridge not available");
        return;
    }
    
    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
    if (!cxxBridge.runtime) {
        RCTLogError(@"🔴 [StockfishJSIInstaller] Runtime not available");
        return;
    }
    
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] Installing JSI bindings via RuntimeExecutor...");
    
    // Use runtime directly (New Arch compatible)
    jsi::Runtime *runtime = (jsi::Runtime *)cxxBridge.runtime;
    if (runtime) {
        @try {
            installStockfish(*runtime);
            RCTLogInfo(@"🟢 [StockfishJSIInstaller] ✅ JSI bindings installed successfully!");
        } @catch (NSException *exception) {
            RCTLogError(@"🔴 [StockfishJSIInstaller] Failed to install: %@", exception.reason);
        }
    } else {
        RCTLogError(@"🔴 [StockfishJSIInstaller] Runtime is null");
    }
}

@end

