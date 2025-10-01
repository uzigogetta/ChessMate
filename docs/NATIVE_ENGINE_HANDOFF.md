# 🔄 Native Stockfish Engine - Handoff Document

## 📅 Session Summary (2025-10-01)

**Goal**: Implement native Stockfish 17.1 JSI module for iOS/Android to achieve Chess.com-level performance.

**Status**: ⚠️ **95% Complete** - Autolinking works, C++ needs Mac debugging

---

## ✅ What We Accomplished

### **1. Stockfish C++ Sources Vendored**
- ✅ Added as git submodule: `packages/react-native-stockfish-jsi/cpp/stockfish`
- ✅ Checked out Stockfish 17.1 (tag: `sf_17.1`, commit: `03e27488`)
- ✅ All sources present (~500 files, 2MB)

### **2. NNUE Neural Network Bundled**
- ✅ Downloaded 61.5MB NNUE file (`nn-0000000000a0.nnue`)
- ✅ Bundled for iOS: `packages/react-native-stockfish-jsi/ios/stockfish.nnue`
- ✅ Bundled for Android: `packages/react-native-stockfish-jsi/android/src/main/assets/stockfish.nnue`

### **3. JSI Bridge Implemented**
- ✅ C++ bridge: `packages/react-native-stockfish-jsi/cpp/StockfishJSI.cpp`
- ✅ iOS wrapper: `packages/react-native-stockfish-jsi/ios/StockfishJSI.mm`
- ✅ Android JNI: `packages/react-native-stockfish-jsi/android/src/main/cpp/StockfishJSI.cpp`
- ✅ TypeScript API: `packages/react-native-stockfish-jsi/src/NativeStockfish.ts`

### **4. Build Configuration**
- ✅ iOS Podspec: `packages/react-native-stockfish-jsi/react-native-stockfish-jsi.podspec` (at package ROOT)
- ✅ Android CMakeLists: `packages/react-native-stockfish-jsi/android/src/main/cpp/CMakeLists.txt`
- ✅ Compiler flags: `-Ofast -ffast-math -flto` (aggressive optimization)
- ✅ C++17 standard with pthread support

### **5. NPM Package Published**
- ✅ Package: `@uzigogetta/react-native-stockfish-jsi`
- ✅ Latest version: `0.1.4` (as of 2025-10-01)
- ✅ Published to: https://www.npmjs.com/package/@uzigogetta/react-native-stockfish-jsi
- ✅ Size: 108.5 MB (includes Stockfish sources + NNUE)

### **6. Autolinking WORKS! 🎉**
After 7+ build attempts, we fixed:
- ✅ Podspec at **package root** (not in `ios/` subfolder)
- ✅ Podspec included in `"files"` array in package.json
- ✅ Published to npm registry (not workspace package)
- ✅ EAS Build now discovers it: **"Found 13 modules"** ✅
- ✅ CocoaPods installs it: **"Installing react-native-stockfish-jsi"** ✅

---

## ⚠️ What's Still Broken

### **C++ Compilation Errors (Needs Mac to Debug)**

**Last build error (v0.1.3):**
```
❌ 'ReactCommon/RCTTurboModule.h' file not found
❌ no member named 'time' in 'Stockfish::Search::InfoFull'
❌ use of undeclared identifier 'send'
❌ cannot use 'try' with exceptions disabled
```

**Root cause:**
- Stockfish 17.1 API changes (InfoFull struct different)
- Header paths need adjustment
- Exception handling not compatible with compiler flags
- **Cannot debug without Mac** (EAS only shows summary errors)

**Current workaround (v0.1.4):**
- Simplified C++ to use `UCIEngine` class directly
- Removed custom InfoFull parsing
- Removed try/catch blocks
- **Might compile, but might not work optimally**

---

## 🎯 What Needs to Be Done (On Mac)

### **Priority 1: Fix C++ Compilation**

1. **Run local build**:
   ```bash
   npx expo run:ios
   ```

2. **Analyze FULL Xcode errors** (not EAS summaries)

3. **Fix the C++ code** based on Stockfish 17.1 actual API:
   - Use correct InfoFull struct members (`timeMs` not `time`)
   - Fix header includes for React Native JSI
   - Remove or enable exceptions properly
   - Ensure Score type is printed correctly

4. **Iterate** until clean compilation

### **Priority 2: Test Functionality**

1. **Verify engine loads**:
   - Check console for: `[EngineManager] Native Stockfish loaded`
   - Global should exist: `window.StockfishJSI`

2. **Test AI gameplay**:
   - AI Setup screen loads instantly (<1s)
   - AI moves come back in <500ms
   - No crashes or freezes

3. **Benchmark performance**:
   ```javascript
   await window.__engineTest(16)
   ```
   - Browser: ~15 seconds
   - Native: Should be <2 seconds

### **Priority 3: Optimize & Polish**

1. **Multi-threading**: Ensure it uses 2-4 cores properly
2. **NNUE loading**: Verify neural network loads from bundle
3. **Memory management**: Check for leaks with Instruments
4. **Thermal management**: Ensure it doesn't overheat device

---

## 📁 Key Files to Work With (On Mac)

### **C++ JSI Bridge (Main Work Here):**
```
packages/react-native-stockfish-jsi/cpp/StockfishJSI.cpp
```

**What it does:**
- Creates background thread for Stockfish engine
- Implements JSI functions: init(), send(), setOnMessage(), dispose()
- Redirects Stockfish output to JavaScript callbacks
- Manages command queue (thread-safe)

**Known issues:**
- InfoFull struct members (needs to match Stockfish 17.1)
- Header paths (React Native JSI headers)
- Exception handling (disabled by compiler flags)

### **iOS Integration:**
```
packages/react-native-stockfish-jsi/ios/StockfishJSI.mm
```

**What it does:**
- Hooks JSI installation into React Native bridge
- Provides NNUE file path from app bundle
- Objective-C++ wrapper

**Should work as-is** (no changes needed)

### **Podspec (Build Config):**
```
packages/react-native-stockfish-jsi/react-native-stockfish-jsi.podspec
```

**What it does:**
- Tells CocoaPods which files to compile
- Sets compiler flags: `-Ofast -ffast-math -flto`
- Includes all Stockfish C++ sources

**Might need tweaking:**
- Header search paths
- Compiler flags (if exceptions needed)
- Source file patterns

---

## 🔧 Likely Fixes Needed (Based on Errors)

### **Fix 1: InfoFull Struct**
```cpp
// WRONG (what we had):
oss << info.time;

// CORRECT (Stockfish 17.1):
oss << info.timeMs;  // Changed from 'time' to 'timeMs'
```

### **Fix 2: Score Output**
```cpp
// WRONG:
*outputStream << info.score;

// CORRECT:
*outputStream << Stockfish::UCIEngine::format_score(info.score);
```

### **Fix 3: React Headers**
```cpp
// If header not found, update Podspec HEADER_SEARCH_PATHS:
s.pod_target_xcconfig = {
  "HEADER_SEARCH_PATHS" => [
    "$(PODS_ROOT)/Headers/Public/React-Core",
    "$(PODS_ROOT)/Headers/Public/ReactCommon",
    "$(PODS_ROOT)/RCT-Folly",
    // ... etc
  ]
}
```

### **Fix 4: Enable Exceptions (If Needed)**
```ruby
# In Podspec:
s.compiler_flags = "-std=c++17 -O3 -DNDEBUG -fexceptions"  # Add -fexceptions
```

---

## 📊 Testing Checklist (After Compilation Works)

### **Basic Functionality:**
- [ ] App launches without crash
- [ ] AI Setup screen loads
- [ ] "Start Game" button enables quickly (<1s)
- [ ] Engine badge shows "Native Engine" with green dot
- [ ] AI makes first move within 1 second
- [ ] No console errors

### **Performance Test:**
```javascript
// In console/debugger:
await window.__engineTest(16)
```
- [ ] Completes in <2 seconds (not ~15s)
- [ ] Returns valid bestmove
- [ ] No crashes

### **Stress Test:**
- [ ] Play 10+ moves without issues
- [ ] Switch difficulty levels (Beginner → Advanced)
- [ ] Background/foreground app (engine survives)
- [ ] Start multiple games (engine disposes properly)

### **Memory Test:**
```javascript
// Play 50 moves and check memory usage
for (let i = 0; i < 50; i++) {
  // Make moves, check Activity Monitor
}
```
- [ ] Memory stays stable (<200 MB)
- [ ] No leaks (use Xcode Instruments)

---

## 🚀 Once Everything Works on Mac

### **Step 1: Final Publish**
```bash
cd packages/react-native-stockfish-jsi
npm version 1.0.0  # Official release!
npm publish --access public
```

### **Step 2: Update App**
```bash
cd ../..
pnpm update @uzigogetta/react-native-stockfish-jsi@1.0.0
git add -A
git commit -m "feat: Native Stockfish engine v1.0.0 - Chess.com-level performance"
git push
```

### **Step 3: EAS Build (Will Work Automatically)**
```bash
eas build --profile production --platform all
```

**No more issues!** Autolinking works, C++ compiles, ready for production! ✅

---

## 📝 Additional Notes

### **Why Browser Engine is Still There:**
The EngineManager has automatic fallback:
```typescript
Native → Browser → Mock
```

If native fails to load, browser engine activates automatically. This is GOOD for:
- Development/testing
- Older devices
- Fallback safety

### **How to Force Native Mode:**
In engine settings, set mode to `"native"`. It will only use native, error if unavailable.

---

## 🎯 Success Criteria

You'll know it's working when:

1. **Init time**: <100ms (console shows engine ready instantly)
2. **Move time**: <500ms even at high depth
3. **Strength**: Can beat browser engine easily
4. **Stability**: No crashes after 100+ moves
5. **Badge**: Shows "Native Engine" in green

---

## 💬 Questions to Ask Me (On Mac)

- "Here's the Xcode error, how do I fix it?"
- "Build succeeded but engine isn't loading, what's wrong?"
- "How do I optimize threading/NNUE?"
- "Should I enable ccache for faster rebuilds?"
- "How do I profile performance with Instruments?"

**I'll guide you through everything!** 🤝

---

**Ready to build world-class chess engine!** 🏆♟️

