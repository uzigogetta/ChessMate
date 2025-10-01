# Native Stockfish JSI Implementation Guide

## Quick Summary

This module compiles Stockfish C++ directly for iOS/Android and exposes it to React Native via JSI (zero-overhead bridge).

---

## Phase 1: Vendor Stockfish Sources

```bash
cd packages/react-native-stockfish-jsi
git submodule add https://github.com/official-stockfish/Stockfish.git cpp/stockfish
cd cpp/stockfish
git checkout sf_17.1  # or latest stable tag
```

We need these files from `Stockfish/src/`:
- `*.cpp` and `*.h` (core engine)
- `nnue/` folder (neural network evaluator)

---

## Phase 2: iOS Implementation

### 2.1 JSI Bridge (`cpp/StockfishJSI.cpp`)

The bridge exposes 4 functions to JavaScript:
- `install()` - Sets up the global `StockfishJSI` object
- `init(options)` - Initializes engine with UCI options
- `send(command)` - Sends UCI command to engine
- `setOnMessage(callback)` - Registers JS callback for engine output
- `dispose()` - Cleans up engine thread

### 2.2 iOS Integration (`ios/StockfishJSI.mm`)

Objective-C++ file that:
- Imports `cpp/StockfishJSI.cpp`
- Installs JSI bindings on app load
- Hooks into React Native's `RCTCxxBridge`

### 2.3 Podspec (`ios/StockfishJSI.podspec`)

Defines:
- Source files (all Stockfish `.cpp`)
- Compiler flags: `-Ofast -flto -DNDEBUG -DUSE_PTHREADS -DNNUE_EMBEDDING_OFF`
- Header search paths
- Frameworks: `Foundation`

### 2.4 NNUE Net Bundling

Download the default net:
```bash
curl -O https://tests.stockfishchess.org/api/nn/nn-9067e33176e8.nnue
mv nn-9067e33176e8.nnue ios/stockfish.nnue
```

Configure engine to load it from app bundle.

---

## Phase 3: Android Implementation

### 3.1 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.18)
project(StockfishJSI)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Ofast -flto -DNDEBUG -DUSE_PTHREADS")

file(GLOB STOCKFISH_SOURCES "cpp/stockfish/src/*.cpp")
add_library(StockfishJSI SHARED ${STOCKFISH_SOURCES} cpp/StockfishJSI.cpp)

target_include_directories(StockfishJSI PRIVATE
  cpp/stockfish/src
  ${REACT_NATIVE_DIR}/ReactCommon/jsi
)

target_link_libraries(StockfishJSI log android)
```

### 3.2 Gradle Integration

Update `android/build.gradle` to:
- Enable CMake
- Set `minSdkVersion 24`
- Configure NDK build
- Bundle NNUE net in assets

---

## Phase 4: Testing & Benchmarks

### 4.1 Sanity Test
```typescript
const engine = new NativeStockfish();
await engine.init({ threads: 2, hashMB: 64, skill: 20 });
engine.send('position startpos');
engine.send('go depth 15');
// Expect bestmove in <500ms on modern device
```

### 4.2 Benchmark
Compare native vs browser:
- `go depth 16` from startpos
- Measure: time, nodes, nps
- Native should be 5-10x faster

### 4.3 Stress Test
- Background/foreground transitions
- Rapid mode changes
- Memory usage over 100 positions

---

## Expected Performance (iPhone 13+, Android flagship)

| Metric | Browser (asm.js) | Native (C++ JSI) |
|--------|------------------|------------------|
| Init time | 15-20s | <100ms |
| Depth 10 | ~3s | ~300ms |
| Depth 16 | ~15s | ~2s |
| NPS (single) | ~50k | ~500k |
| NPS (4 threads) | N/A | ~1.5M |
| Strength | ~2400 Elo | ~3200 Elo |

---

## Current Status

- ✅ Package structure
- ✅ TypeScript wrapper
- ⏳ C++ JSI bridge (skeleton exists)
- ⏳ Stockfish sources (need to vendor)
- ⏳ iOS build config
- ⏳ Android build config
- ⏳ NNUE net bundling
- ⏳ EAS CI integration

---

## Next Steps (In Order)

1. Vendor Stockfish 17.1 sources
2. Implement `cpp/StockfishJSI.cpp` (engine thread, command queue, JSI functions)
3. Wire up iOS: Podspec, build flags, NNUE bundling
4. Test on device
5. Repeat for Android
6. Add to main app's `package.json` dependencies
7. Build dev client with `npx expo run:ios`
8. Validate fallback still works when native unavailable

