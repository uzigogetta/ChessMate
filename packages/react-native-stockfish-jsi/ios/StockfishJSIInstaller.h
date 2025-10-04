#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>
#import <ReactCommon/RuntimeExecutor.h>

// Define the protocol inline since React doesn't export it
@protocol RCTRuntimeExecutorModule <NSObject>
@property (nonatomic, readonly) facebook::react::RuntimeExecutor runtimeExecutor;
@end

@interface StockfishJSIInstaller : NSObject <RCTBridgeModule, RCTRuntimeExecutorModule>
@property (nonatomic, weak) RCTBridge *bridge;
@end

