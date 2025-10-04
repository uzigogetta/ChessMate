#import <Foundation/Foundation.h>

@class EXJavaScriptRuntime;

@interface StockfishJSIShim : NSObject

// Expose a nice Swift name: install(runtime:)
+ (void)installWithRuntime:(nonnull EXJavaScriptRuntime *)runtime
    NS_SWIFT_NAME(install(runtime:));

@end

