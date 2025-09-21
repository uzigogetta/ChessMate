# ChessMate (Mobile)

## Progress
- [x] Step 0 — Bootstrap & Baseline Config
- [x] Step 0 — Finisher (Lint/Prettier, Sentry, EAS Updates, Icons)
- [x] Step 1 — Routing skeleton & screens
- [x] Step 2 — Skia board (tap-to-move)
- [x] Step 3 — AI mock reply + swap/undo/reset
 - [x] Step 4 — Online scaffold (rooms, 1v1/2v2)
 - [x] Step 5 — Robust online UX (validation, reconnection, presence, chat, persistence)
 - [x] Step 6 — Supabase Realtime adapter (host-authoritative, cross-device)

## How to run
- Install deps: `pnpm install`
- Start (Dev Client): `npx expo start --dev-client`
- Lint: `pnpm lint`
- Format: `pnpm format`

## Env
- Set `EXPO_PUBLIC_SENTRY_DSN` in `.env` or your variables provider when ready.

## Navigation
- Tabs: Play, Puzzles, Archive, Profile
- Online room example: `/game/online/test123` shows "Room: test123"
 - Chessboard: Tap your piece to see legal dots; tap target to move (turn from FEN).
 - Dev overlay (dev builds): shows fen, turn, your side, and turn status.

