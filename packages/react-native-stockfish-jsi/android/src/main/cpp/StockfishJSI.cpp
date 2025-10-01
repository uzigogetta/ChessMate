#include <jni.h>
#include <jsi/jsi.h>
#include <fbjni/fbjni.h>
#include <ReactCommon/CallInvokerHolder.h>
#include <string>
#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>

// Forward declaration from the shared C++ bridge
extern "C" void installStockfish(facebook::jsi::Runtime& rt);

// Global variables for Android
static JavaVM* g_jvm = nullptr;
static jobject g_assetManager = nullptr;

// Platform-specific NNUE path implementation for Android
std::string getNNUEPath() {
    // For Android, we'll extract the NNUE file from assets to internal storage
    // and return the path to the cache directory
    if (!g_jvm) return "";
    
    JNIEnv* env = nullptr;
    g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6);
    if (!env) return "";
    
    // Get the context from the current activity
    jclass activityThreadClass = env->FindClass("android/app/ActivityThread");
    if (!activityThreadClass) return "";
    
    jmethodID currentActivityThreadMethod = env->GetStaticMethodID(activityThreadClass, "currentActivityThread", "()Landroid/app/ActivityThread;");
    jobject activityThread = env->CallStaticObjectMethod(activityThreadClass, currentActivityThreadMethod);
    
    jmethodID getApplicationMethod = env->GetMethodID(activityThreadClass, "getApplication", "()Landroid/app/Application;");
    jobject context = env->CallObjectMethod(activityThread, getApplicationMethod);
    
    // Get the cache directory
    jclass contextClass = env->FindClass("android/content/Context");
    jmethodID getCacheDirMethod = env->GetMethodID(contextClass, "getCacheDir", "()Ljava/io/File;");
    jobject cacheDir = env->CallObjectMethod(context, getCacheDirMethod);
    
    jclass fileClass = env->FindClass("java/io/File");
    jmethodID getAbsolutePathMethod = env->GetMethodID(fileClass, "getAbsolutePath", "()Ljava/lang/String;");
    jstring cachePath = (jstring)env->CallObjectMethod(cacheDir, getAbsolutePathMethod);
    
    const char* cachePathStr = env->GetStringUTFChars(cachePath, nullptr);
    std::string result(cachePathStr);
    env->ReleaseStringUTFChars(cachePath, cachePathStr);
    
    return result;
}

extern "C" JNIEXPORT void JNICALL
Java_com_chessmate_stockfish_StockfishJSIModule_nativeInstall(
    JNIEnv* env,
    jobject thiz,
    jlong jsiRuntimePointer) {
    
    if (jsiRuntimePointer == 0) {
        return;
    }
    
    auto runtime = reinterpret_cast<facebook::jsi::Runtime*>(jsiRuntimePointer);
    if (runtime) {
        installStockfish(*runtime);
    }
}

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void*) {
    g_jvm = vm;
    return JNI_VERSION_1_6;
}
