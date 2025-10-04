#import "StockfishJSIShim.h"
#import <jsi/jsi.h>

using namespace facebook;

// Your C++ binder (must set global.StockfishJSI and be noexcept)
extern void installStockfishBindings(jsi::Runtime& rt) noexcept;

@implementation StockfishJSIShim
+ (void)installWithRuntime:(EXJavaScriptRuntime *)runtime {
  // Grab the JSI pointer from Expo's runtime wrapper
  jsi::Runtime *rt = (jsi::Runtime *)runtime.jsiRuntimePointer;
  if (rt) {
    installStockfishBindings(*rt);
  }
}
@end

