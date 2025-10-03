#import <React/RCTBridgeModule.h>
#import <ReactCommon/RuntimeExecutor.h>

@protocol RCTRuntimeExecutorModule <NSObject>
@property (nonatomic, readonly) facebook::react::RuntimeExecutor runtimeExecutor;
@end

@interface StockfishJSIInstaller : NSObject <RCTBridgeModule, RCTRuntimeExecutorModule>
@end

