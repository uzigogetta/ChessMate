#import <Foundation/Foundation.h>
#import <ExpoModulesCore/EXJavaScriptRuntime.h> // Swift name: JavaScriptRuntime

@interface StockfishJSIShim : NSObject
// Expose a nice Swift name: install(runtime:)
+ (void)installWithRuntime:(nonnull EXJavaScriptRuntime *)runtime
  NS_SWIFT_NAME(install(runtime:));
@end

