#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>
#import <ReactCommon/RuntimeExecutor.h>
#import <React/RCTRuntimeExecutorModule.h>

@interface StockfishJSIInstaller : NSObject <RCTBridgeModule, RCTRuntimeExecutorModule>
@property (nonatomic, weak) RCTBridge *bridge;
@end

