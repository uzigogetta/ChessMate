# Build Log

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


