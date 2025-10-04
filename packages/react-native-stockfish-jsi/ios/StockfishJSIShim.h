#import <Foundation/Foundation.h>

@class EXJavaScriptRuntime;

@interface StockfishJSIShim : NSObject

+ (void)installWithRuntime:(nonnull EXJavaScriptRuntime *)runtime;

@end

