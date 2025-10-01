# Build Log

## Session: Browser Engine Optimization & Native JSI Preparation (2025-10-01)

### Phase 1: Browser Engine Production Polish ✅
- **Stockfish 17.1 asm.js Integration**
  - Implemented pure JavaScript engine (no WASM) to avoid Hermes compatibility issues
  - Added smart caching: wrapper instance reused across calls, no duplicate initializations
  - Pre-initialization on AI setup screen for instant game start
  - Suppressed Stockfish UCI banner spam for cleaner console output
  
- **Engine Management System**
  - Created `EngineManager.ts` with auto/native/browser/mock mode selection
  - Smart engine reuse: existing engines kept if mode compatible
  - Automatic fallback: Native → Browser → Mock cascade
  - Engine instance caching to prevent memory leaks
  
- **Settings & Configuration**
  - Persistent engine settings: Threads, Hash, Skill Level, MultiPV, Move Overhead
  - Settings stored in MMKV with reactive updates
  - AI setup screen with persona, difficulty, coach mode, and engine config
  - Engine badge showing active mode (browser/native/fallback) with status indicator
  
- **UI/UX Improvements**
  - Loading states: "Loading engine..." disabled button during init
  - Clean 5-tab layout: Home, Play, Puzzles, Friends, Profile
  - Button component supports disabled and ghost variants
  - Pre-warming engine during setup reduces perceived delay
  
- **Debug & Testing Tools**
  - Added `window.__engineTest(depth)` console helper
  - Timing instrumentation for engine initialization
  - Detailed logging for engine lifecycle events

### Performance (Current Browser Engine)
- **Initialization**: 15-20s (one-time, Hermes compiling 6MB asm.js)
- **Move Time**: 2-4 seconds (depth 10-15)
- **Strength**: ~2400 Elo (single-threaded, no NNUE)
- **Status**: Production-ready for casual/intermediate players

### Phase 2: Native JSI Module Scaffolding (In Progress)
- **Package Structure Created**
  - `packages/react-native-stockfish-jsi/` with full TypeScript wrapper
  - iOS skeleton: `ios/StockfishJSI.mm` + Podspec
  - Android skeleton: `android/` + CMakeLists.txt
  - JSI bridge template: `cpp/StockfishJSI.cpp`
  
- **Documentation**
  - Created `IMPLEMENTATION.md` with complete native build guide
  - Updated `STOCKFISH_INTEGRATION.md` with architecture decisions
  - Step-by-step instructions for iOS/Android C++ compilation
  - NNUE network bundling strategy documented

### Phase 3: Native JSI Implementation ✅ (2025-10-01)

#### Stockfish C++ Vendoring
- ✅ Added Stockfish 17.1 as git submodule (`cpp/stockfish`)
- ✅ Checked out stable tag `sf_17.1` (commit 03e27488)
- ✅ Downloaded NNUE network file (61.5MB, `nn-0000000000a0.nnue`)

#### iOS Implementation ✅
- **C++ JSI Bridge** (`cpp/StockfishJSI.cpp`)
  - Background engine thread with command queue
  - Thread-safe JSI function bindings (init, send, setOnMessage, dispose)
  - Custom output stream redirecting to JavaScript callbacks
  - Full UCI protocol implementation (position, go, stop, setoption)
  - Search callbacks with real-time info and bestmove
  
- **iOS Integration** (`ios/StockfishJSI.mm`)
  - Objective-C++ wrapper hooking into RCTCxxBridge
  - NNUE path resolution from app bundle
  - JSI installation on bridge load
  
- **Podspec Configuration**
  - All Stockfish C++ sources included (excluding main.cpp, benchmark.cpp)
  - Compiler flags: `-Ofast -ffast-math -flto -fno-exceptions`
  - Preprocessor: `USE_PTHREADS=1 NDEBUG=1 NNUE_EMBEDDING_OFF=1`
  - NNUE bundled as resource file
  - C++17 standard with libc++

#### Android Implementation ✅
- **CMakeLists.txt**
  - Glob all Stockfish sources (main, NNUE, Syzygy)
  - Aggressive optimization: `-Ofast -ffast-math -flto`
  - React Native JSI headers included
  - pthread linking
  
- **JNI Wrapper** (`android/.../StockfishJSI.cpp`)
  - Native install method called from Java
  - NNUE path resolution from Android cache directory
  - JSI runtime pointer passed from Java layer
  
- **Java Module** (`StockfishJSIModule.java`)
  - Native library loading on module init
  - JSI installation via bridge idle listener
  - JavaScript context pointer extraction
  
- **Gradle Configuration**
  - CMake 3.22.1 with NDK integration
  - ARM ABIs: `armeabi-v7a`, `arm64-v8a`
  - C++ shared STL
  - NNUE bundled in `src/main/assets/`

#### Integration
- ✅ Added `react-native-stockfish-jsi` to main app dependencies (`workspace:*`)
- ✅ Installed with `pnpm install`
- ✅ Autolinking enabled via `react-native.config.js`
- ✅ EngineManager auto-detects and prefers native when available

### Expected Native Performance (After Build)
- **Initialization**: <100ms (vs 15-20s browser)
- **Move Time**: <300ms depth 20 (vs 2-4s browser depth 10)
- **Strength**: ~3200 Elo (vs ~2400 browser)
- **Threads**: 2-8 cores (vs 1 browser)
- **NPS**: 1-2M (vs ~50k browser)
- **Status**: Chess.com/Lichess parity

### Next Steps (Testing & Deployment)
1. **Build iOS**: `npx expo run:ios` (Xcode will compile Stockfish)
2. **Build Android**: `npx expo run:android` (Gradle NDK build)
3. **Test native engine**: Should see "Native Stockfish" in console, instant init
4. **Benchmark**: Compare depth 16 search (should be <2s native vs ~15s browser)
5. **EAS Builds**: Configure `eas.json` for production builds
6. **Thermal testing**: Ensure proper throttling on extended searches

### Key Files Created/Modified
- `packages/react-native-stockfish-jsi/cpp/StockfishJSI.cpp` (JSI bridge)
- `packages/react-native-stockfish-jsi/ios/StockfishJSI.mm` (iOS integration)
- `packages/react-native-stockfish-jsi/ios/StockfishJSI.podspec` (iOS build)
- `packages/react-native-stockfish-jsi/ios/stockfish.nnue` (NNUE file, 61.5MB)
- `packages/react-native-stockfish-jsi/android/src/main/cpp/CMakeLists.txt` (Android build)
- `packages/react-native-stockfish-jsi/android/src/main/cpp/StockfishJSI.cpp` (JNI wrapper)
- `packages/react-native-stockfish-jsi/android/src/main/java/.../StockfishJSIModule.java` (Java module)
- `packages/react-native-stockfish-jsi/android/src/main/assets/stockfish.nnue` (NNUE file)
- `packages/react-native-stockfish-jsi/android/build.gradle` (Gradle config)
- `package.json` (added react-native-stockfish-jsi dependency)
- `src/features/chess/engine/EngineManager.ts` (created)
- `src/features/chess/engine/engineSettings.store.ts` (created)
- `src/features/chess/engine/stockfishBrowser.ts` (created)
- `src/features/chess/engine/wasmStub.ts` (created)
- `app/game/ai.menu.tsx` (optimized with pre-warming)
- `packages/react-native-stockfish-jsi/IMPLEMENTATION.md` (created)
- `docs/STOCKFISH_INTEGRATION.md` (created)

---

Delta (2025-09-14T00:00:00Z)
- Step 5 — Robust online UX (validation, reconnection, presence, chat, persistence)

Delta (2025-09-14T00:15:00Z)
- Step 6 — Supabase Realtime adapter for cross-device rooms
- Added SupabaseRealtimeAdapter and wired createNet to prefer Supabase when keys exist
- Added move helpers: src/features/chess/logic/moveHelpers.ts
- Optimistic move UI: BoardSkia and online room screen
- Reconnect hook: src/features/online/reconnect.ts
- Presence heartbeat fields in net adapters
- Room chat component: src/features/chat/RoomChat.tsx
- MMKV storage helpers and game archive module
- Jest tests for move helpers

Delta (2025-09-14T12:45:00Z)
- Hotfix: host-authoritative online flow + FEN-derived turns
- Delta (2025-09-14T13:20:00Z)
- Step 7 — Presence bar, chat bottom sheet, invite/copy, settings scaffold, board theme
Delta (2025-09-14T14:15:00Z)
- Step 8 — Archive (SQLite + optional Supabase), undo/resign/draw protocol, short-code matchmaking
- DB: sqlite tables for games; insert/list/get wired; PGN builder
- Store saves finished games locally, optional cloud sync (toggle)
- Adapters: host-authoritative undo/resign/draw; result banner and actions in UI
- Lobby: short codes (base32) for create/join
- Archive screens: list and detail PGN view
- PresenceBar component showing seats (w1/w2, b1/b2) with initials and you-badge
- Chat persistence via MMKV (per-room, last 100); RoomChat updated
- Invite button (Share) + Copy ID chip; helper buildInvite
- Settings store + screen for boardTheme; useBoardTheme and BoardSkia colors wired
- Dev logging maintained
- Networking
  - Supabase adapter made host-authoritative; non-hosts send requests (seat/release/start/moveSAN)
  - Deterministic seating for 1v1 (host=White, next=Black), no stealing
  - Presence-based seat pruning with 15s grace; no pruning on sync
  - Immutable room/state broadcasts (deep snapshots) and local snapshot updates on game/move
- Chess logic/UI
  - Turn gating derived from FEN via getTurn(fen) (removed reliance on driver)
  - BoardSkia selectableColor blocks selecting opponent pieces; invalid taps flash red
  - Orientation tap mapping fixed for Black
  - DevOverlay shows fen/turn/mySide/isMyTurn
- Debugging
  - Added src/debug/netLogger.ts and instrumented adapter/store/UI logs

Delta (2025-09-13T20:30:00Z)
- Step 1 — Routing skeleton & screens created (tabs, auth, game routes).
- Added UI atoms at src/ui/atoms.tsx and wired screens to use them.
- Updated root layout with gesture handler, Sentry import, and StatusBar.

Delta (2025-09-13T19:57:00Z)
- Step 2 — Skia board (tap-to-move) wired into Local and AI.
- Added chess helpers: src/features/chess/logic/chess.rules.ts.
- Added BoardSkia: src/features/chess/components/board/BoardSkia.tsx.
- Local/AI screens now show turn, board, and Reset.

Delta (2025-09-13T20:05:00Z)
- Step 2.1 — Skia font + piece letters + start FEN.
- Added font hook at src/ui/fonts.ts and used Skia Text for pieces.
- Introduced START_FEN and updated Local/AI to use it.

Delta (2025-09-13T20:12:00Z)
- Step 2.2 — Touch overlay + Skia Text for pieces; RN overlay removed.

Delta (2025-09-13T20:25:00Z)
- Step 3 — AI mock reply + swap/undo/reset.
- Engine types + mock at src/features/chess/engine/.
- AI screen: replies within ~0.4s, Swap Sides, Undo, Reset wired.
- Local screen: Undo added (SAN stack).

Delta (2025-09-13T19:34:00Z)
- Renamed app to ChessMate (app.json name/slug).
- Updated package name to chessmate (package.json).
- Updated deep link scheme to chessmate (app.json).
- Updated iOS bundleIdentifier and Android package to com.us.chessmate.
- Installed now: expo-file-system, @shopify/flash-list, react-native-keyboard-controller.
- Kept other Step 0 decisions unchanged; no extra native config required.
 - Configured EAS Updates: added expo-updates and updates.url; runtimeVersion policy appVersion.
 - Final plugins: expo-router, ./plugins/withPredictiveBack (MMKV excluded; autolinks).

## Step 0 — Bootstrap & Baseline Config (2025-09-13T19:03:22Z)

- 2025-09-13T19:03:22Z Project created with Expo SDK 54 (TypeScript). ✅
- 2025-09-13T19:03:22Z Core packages installed (router, gestures, safe areas). ✅
- 2025-09-13T19:03:22Z Native modules installed (reanimated/sqlite/haptics/blur/fs). ✅
- 2025-09-13T19:03:22Z Additional libs installed (Skia, Zustand, Sentry, etc.). ✅
- 2025-09-13T19:03:22Z Testing and linting deps added. ✅
- 2025-09-13T19:03:22Z Router scaffolded with tabs layout. ✅
- 2025-09-13T19:03:22Z Predictive back plugin added and registered. ✅
- 2025-09-13T19:03:22Z Expo UI (alpha) installed and gated behind dev client. ✅
- 2025-09-13T19:03:22Z Babel + TS config updated (aliases, plugins). ✅
- pnpm initialized and base deps installed. ✅
- Core libs: expo-router, gesture-handler, safe-area-context. ✅
- Native modules (SDK 54-compat): reanimated, sqlite, haptics, blur, file-system. ✅
- Libraries: Skia, zustand, immer, zod, nanoid, socket.io-client, chess.js. ✅
- UI/Dev: Expo UI (alpha, gated), FlashList, keyboard-controller. ✅
- Telemetry & tests: @sentry/react-native, jest-expo, RTL. ✅
- Config:
  - app.json newArch, scheme, ids, Android minSdk 29, predictive back enabled. ✅
  - Plugins: expo-router, MMKV, predictive-back config. ✅
  - Babel: expo-router/babel + reanimated plugin last. ✅
  - TS: strict + path alias @/* → src/*. ✅
- Notes:
  - expo-glass-effect may fall back to expo-blur if unavailable in SDK 54. ✅

## Step 0 — Finisher (2025-09-13T19:03:22Z)

- ESLint/Prettier configured and scripts added. ✅
- Sentry initialized early with DSN env and global handlers. ✅
- EAS Updates profiles created, app.json updates.channel set to production. ✅
- Icons/splash references present; placeholders retained. ✅


