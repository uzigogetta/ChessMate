#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>

// Pure Objective-C header - no C++ types
@interface StockfishJSIInstaller : NSObject <RCTBridgeModule>
@property (nonatomic, weak) RCTBridge *bridge;
- (void)install;
@end

