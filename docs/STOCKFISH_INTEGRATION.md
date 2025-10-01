# Stockfish Integration Status

## Current Implementation (✅ Working)

### Browser Engine
- **Build:** `stockfish-17.1-asm-341ff22.js` (pure asm.js, no WASM)
- **Performance:** 2-4 second moves, ~50k nps
- **Init time:** 15-20 seconds (Hermes compiling asm.js)
- **Strength:** ~2400 Elo (Skill 20, single-thread, limited NNUE)
- **Status:** Production-ready fallback ✅

### Engine Manager
- **Mode selection:** Auto / Native / Browser
- **Fallback chain:** Native (if available) → Browser → Mock
- **Settings persistence:** Threads, Hash, Skill, MultiPV, Move Overhead
- **Smart caching:** Reuses engine instance across games

### UI/UX
- **Setup screen:** Pre-initializes engine while user configures
- **Badge:** Shows active mode (green when ready)
- **Loading states:** Button disabled until engine ready
- **Console helper:** `window.__engineTest(depth)` for debugging

---

## Future: Native JSI Module (⏳ Planned)

### Why Native?
- **10-20x faster** than asm.js
- **Instant init** (<100ms vs 15-20s)
- **Multi-threading** (2-8 cores)
- **Full NNUE** (GM-level strength, ~3200 Elo)
- **No JS thread blocking**

### Implementation Checklist

- [ ] Vendor Stockfish 17.1 C++ sources as git submodule
- [ ] Implement `cpp/StockfishJSI.cpp`:
  - [ ] Engine worker thread with command queue
  - [ ] JSI function bindings (install, init, send, setOnMessage, dispose)
  - [ ] Thread-safe callback mechanism
- [ ] iOS build:
  - [ ] Podspec with Stockfish sources
  - [ ] Compile flags: `-Ofast -flto -DNNUE_EMBEDDING_OFF`
  - [ ] Bundle `nn-9067e33176e8.nnue` in app
  - [ ] Hook JSI installation in AppDelegate
- [ ] Android build:
  - [ ] CMakeLists.txt with NDK config
  - [ ] Gradle integration
  - [ ] Bundle NNUE in assets
  - [ ] Hook JSI in MainApplication
- [ ] Testing:
  - [ ] Depth 16 benchmark (should be <2s)
  - [ ] Background/foreground handling
  - [ ] Memory leak check
- [ ] EAS build configs for CI
- [ ] Fallback validation (browser engine when native unavailable)

### Estimated Timeline
- iOS implementation: 4-6 hours
- Android implementation: 3-4 hours
- Testing & polish: 2-3 hours
- **Total: ~10-12 hours** for full native integration

### Performance Targets (iPhone 13+)
- Init: <100ms
- Depth 10: <300ms
- Depth 16: <2s
- NPS (4 threads): >1.5M
- Strength: ~3200 Elo

---

## Current Recommendation

**For immediate launch:** Ship with the browser engine—it works reliably, provides good strength for casual play, and requires zero native code.

**For "better than Chess.com":** Implement native JSI module in a focused session. The browser engine will remain as a robust fallback.

---

## Next Session: Native JSI Implementation

When ready to implement native:

1. Run: `cd packages/react-native-stockfish-jsi && git submodule add https://github.com/official-stockfish/Stockfish.git cpp/stockfish`
2. Implement `cpp/StockfishJSI.cpp` per IMPLEMENTATION.md
3. Configure iOS build
4. Test with `npx expo run:ios`
5. Repeat for Android

The EngineManager will automatically detect and prefer native when available.

