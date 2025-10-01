package com.chessmate.stockfish;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;

@ReactModule(name = StockfishJSIModule.NAME)
public class StockfishJSIModule extends ReactContextBaseJavaModule {
    public static final String NAME = "StockfishJSI";

    static {
        try {
            System.loadLibrary("stockfish-jsi");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public StockfishJSIModule(ReactApplicationContext reactContext) {
        super(reactContext);
        installJSI();
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    private void installJSI() {
        ReactApplicationContext context = getReactApplicationContext();
        
        context.getCatalystInstance().addBridgeIdleDebugListener(new Runnable() {
            @Override
            public void run() {
                long jsContextPointer = context.getJavaScriptContextHolder().get();
                if (jsContextPointer != 0) {
                    nativeInstall(jsContextPointer);
                }
            }
        });
    }

    private native void nativeInstall(long jsiRuntimePointer);
}

