#import "StockfishJSIShim.h"
#import <ExpoModulesCore/EXJavaScriptRuntime.h>
#import <jsi/jsi.h>

using namespace facebook;

// C++ function that installs JSI bindings
extern "C" void installStockfish(jsi::Runtime& rt);

@implementation StockfishJSIShim

+ (void)installWithRuntime:(EXJavaScriptRuntime *)runtime {
    // EXJavaScriptRuntime exposes the underlying JSI runtime pointer
    jsi::Runtime *rt = (jsi::Runtime *)runtime.jsiRuntimePointer;
    if (rt) {
        installStockfish(*rt);
    }
}

@end

