#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <jsi/jsi.h>

using namespace facebook;

// Forward declaration from StockfishJSI.cpp
extern "C" void installStockfish(jsi::Runtime& rt);

@interface StockfishJSIInstaller : NSObject <RCTBridgeModule>
@end

@implementation StockfishJSIInstaller

RCT_EXPORT_MODULE();

@synthesize bridge = _bridge;

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXPORT_METHOD(install:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    RCTLogInfo(@"🟢 [StockfishJSIInstaller] install() called from JavaScript!");
    
    @try {
        RCTBridge *bridge = [RCTBridge currentBridge];
        if (!bridge) {
            bridge = _bridge;
        }
        
        if (!bridge) {
            NSString *error = @"Bridge not available";
            RCTLogError(@"🔴 [StockfishJSIInstaller] %@", error);
            reject(@"NO_BRIDGE", error, nil);
            return;
        }
        
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Bridge found, casting to CxxBridge...");
        
        RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
        if (!cxxBridge) {
            NSString *error = @"Not a CxxBridge";
            RCTLogError(@"🔴 [StockfishJSIInstaller] %@", error);
            reject(@"NOT_CXX_BRIDGE", error, nil);
            return;
        }
        
        RCTLogInfo(@"🟢 [StockfishJSIInstaller] Scheduling JSI installation on JS thread...");
        
        // Use invokeAsync to ensure we're on the JS thread when accessing runtime
        [cxxBridge invokeAsync:^{
            @try {
                jsi::Runtime *runtime = (jsi::Runtime *)cxxBridge.runtime;
                if (!runtime) {
                    NSString *error = @"Runtime not available";
                    RCTLogError(@"🔴 [StockfishJSIInstaller] %@", error);
                    reject(@"NO_RUNTIME", error, nil);
                    return;
                }
                
                RCTLogInfo(@"🟢 [StockfishJSIInstaller] Installing JSI bindings on JS thread...");
                installStockfish(*runtime);
                RCTLogInfo(@"🟢 [StockfishJSIInstaller] ✅ JSI bindings installed successfully!");
                resolve(@{@"success": @YES});
            } @catch (NSException *exception) {
                NSString *error = [NSString stringWithFormat:@"Exception on JS thread: %@", exception.reason];
                RCTLogError(@"🔴 [StockfishJSIInstaller] %@", error);
                reject(@"JS_THREAD_EXCEPTION", error, nil);
            }
        }];
    } @catch (NSException *exception) {
        NSString *error = [NSString stringWithFormat:@"Exception: %@", exception.reason];
        RCTLogError(@"🔴 [StockfishJSIInstaller] %@", error);
        reject(@"EXCEPTION", error, nil);
    }
}

@end

