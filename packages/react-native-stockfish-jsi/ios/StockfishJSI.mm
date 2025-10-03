#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <jsi/jsi.h>
#import <Foundation/Foundation.h>
#import <string>

// Forward declaration
extern "C" void installStockfish(facebook::jsi::Runtime& rt);

// Platform-specific NNUE path implementation
std::string getNNUEPath() {
    NSBundle *bundle = [NSBundle mainBundle];
    NSString *nnuePath = [bundle pathForResource:@"stockfish" ofType:@"nnue"];
    if (nnuePath) {
        // Return the directory containing the file
        return std::string([[nnuePath stringByDeletingLastPathComponent] UTF8String]);
    }
    return "";
}

@interface StockfishJSI : NSObject <RCTBridgeModule>
@end

@implementation StockfishJSI {
    BOOL _installed;
    __weak RCTBridge *_bridge;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
    return YES;  // YES ensures early module initialization
}

- (instancetype)init {
    if (self = [super init]) {
        _installed = NO;
        RCTLogInfo(@"🔵 [StockfishJSI] Module initialized - THIS SHOULD SHOW IN METRO!");
        NSLog(@"[StockfishJSI] Module initialized");
        
        // Listen for bridge ready notification
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(bridgeDidInitialize:)
                                                     name:RCTJavaScriptDidLoadNotification
                                                   object:nil];
        
        // Also try with a delay as fallback
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            if (!self->_installed) {
                RCTLogInfo(@"🔵 [StockfishJSI] Attempting delayed JSI installation...");
                NSLog(@"[StockfishJSI] Attempting delayed JSI installation...");
                if (self->_bridge) {
                    [self tryInstallJSI:self->_bridge];
                }
            }
        });
    }
    return self;
}

- (void)bridgeDidInitialize:(NSNotification *)notification {
    RCTLogInfo(@"🔵 [StockfishJSI] ⚡ Bridge did initialize notification received");
    NSLog(@"[StockfishJSI] ⚡ Bridge did initialize notification received");
    if (!_installed && _bridge) {
        RCTLogInfo(@"🔵 [StockfishJSI] ⚡ Attempting to install JSI from notification...");
        NSLog(@"[StockfishJSI] ⚡ Attempting to install JSI from notification...");
        [self tryInstallJSI:_bridge];
        if (_installed) {
            RCTLogInfo(@"🔵 [StockfishJSI] ⚡⚡⚡ SUCCESS! JSI installed from notification!");
            NSLog(@"[StockfishJSI] ⚡⚡⚡ SUCCESS! JSI installed from notification!");
        } else {
            RCTLogInfo(@"🔵 [StockfishJSI] ⚠️ JSI installation from notification failed");
            NSLog(@"[StockfishJSI] ⚠️ JSI installation from notification failed");
        }
    }
}

// OLD Architecture: called when bridge is set
- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;
    RCTLogInfo(@"🔵 [StockfishJSI] setBridge called!");
    NSLog(@"[StockfishJSI] setBridge called");
    if (_installed) {
        RCTLogInfo(@"🔵 [StockfishJSI] Already installed, skipping");
        NSLog(@"[StockfishJSI] Already installed, skipping");
        return;
    }
    
    [self tryInstallJSI:bridge];
}

// Try to install JSI (works for both architectures if called at right time)
- (void)tryInstallJSI:(RCTBridge *)bridge {
    if (_installed) return;
    
    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
    if (!cxxBridge) {
        NSLog(@"[StockfishJSI] Not a CxxBridge, retrying...");
        // Retry after a delay
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self tryInstallJSI:bridge];
        });
        return;
    }
    
    if (!cxxBridge.runtime) {
        NSLog(@"[StockfishJSI] Runtime not ready, retrying...");
        // Retry after a delay
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self tryInstallJSI:bridge];
        });
        return;
    }

    @try {
        NSLog(@"[StockfishJSI] Installing JSI bindings...");
        installStockfish(*(facebook::jsi::Runtime *)cxxBridge.runtime);
        _installed = YES;
        NSLog(@"[StockfishJSI] ✅ Successfully installed JSI bindings");
    } @catch (NSException *exception) {
        NSLog(@"[StockfishJSI] ❌ Failed to install: %@", exception.reason);
    }
}

- (void)invalidate {
    NSLog(@"[StockfishJSI] Module invalidated");
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    _installed = NO;
    _bridge = nil;
}

// Required by RCTBridgeModule protocol
- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

// Exported method that triggers installation for New Architecture
// In New Architecture, calling this method ensures the module loads
RCT_EXPORT_METHOD(install:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSLog(@"[StockfishJSI] install() method called from JavaScript");
    
    if (_installed) {
        resolve(@{@"installed": @YES});
        return;
    }
    
    // If not installed yet, try now
    if (_bridge) {
        [self tryInstallJSI:_bridge];
        resolve(@{@"installed": @(_installed)});
    } else {
        // Wait for bridge
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            if (self->_bridge) {
                [self tryInstallJSI:self->_bridge];
                resolve(@{@"installed": @(self->_installed)});
            } else {
                reject(@"NO_BRIDGE", @"Bridge not available", nil);
            }
        });
    }
}

@end
