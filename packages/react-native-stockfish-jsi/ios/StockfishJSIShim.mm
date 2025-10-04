#import "StockfishJSIShim.h"
#import <jsi/jsi.h>

// C++ function that installs JSI bindings
extern "C" void installStockfish(facebook::jsi::Runtime& rt);

@implementation StockfishJSIShim

+ (void)installWithRuntime:(void *)runtime {
    if (runtime) {
        facebook::jsi::Runtime *jsiRuntime = (facebook::jsi::Runtime *)runtime;
        installStockfish(*jsiRuntime);
    }
}

@end

