#import <React/RCTBridge+Private.h>
#import <React/RCTUtils.h>
#import <ReactCommon/RCTTurboModule.h>
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

@interface StockfishJSI : NSObject
@end

@implementation StockfishJSI

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)setBridge:(RCTBridge *)bridge {
    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
    if (!cxxBridge.runtime) {
        return;
    }

    installStockfish(*(facebook::jsi::Runtime *)cxxBridge.runtime);
}

- (void)invalidate {
    // Cleanup if needed
}

@end
