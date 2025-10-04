#import "StockfishModule.h"
#import <ExpoModulesCore/ExpoModulesCore-Swift.h>
#import <jsi/jsi.h>

using namespace facebook;

// C++ function that installs JSI bindings
extern "C" void installStockfish(jsi::Runtime& rt);

static BOOL s_moduleInstalled = NO;

@implementation StockfishModule

EX_EXPORT_MODULE(StockfishModule)

- (instancetype)init {
    if (self = [super init]) {
        // Install JSI as soon as module is created
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(200 * NSEC_PER_MSEC)),
                       dispatch_get_main_queue(), ^{
                           [self installJSI];
                       });
    }
    return self;
}

- (void)installJSI {
    if (s_moduleInstalled) {
        return;
    }
    
    @try {
        EXJavaScriptRuntime *runtime = [self.appContext runtime];
        if (runtime && runtime.runtime) {
            NSLog(@"🟢 [StockfishModule] Installing JSI bindings via Expo Module...");
            installStockfish(*runtime.runtime);
            s_moduleInstalled = YES;
            NSLog(@"🟢 [StockfishModule] ✅ JSI bindings installed successfully!");
        } else {
            NSLog(@"⚠️ [StockfishModule] Runtime not available yet, retrying...");
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(200 * NSEC_PER_MSEC)),
                           dispatch_get_main_queue(), ^{
                               [self installJSI];
                           });
        }
    } @catch (NSException *exception) {
        NSLog(@"❌ [StockfishModule] Error installing JSI: %@", exception);
    }
}

EX_EXPORT_METHOD_AS(install,
                    install:(EXPromiseResolveBlock)resolve
                    reject:(EXPromiseRejectBlock)reject)
{
    [self installJSI];
    resolve(@(s_moduleInstalled));
}

@end

