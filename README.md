# ChessMate (Mobile)

## Progress
- [x] Step 0 — Bootstrap & Baseline Config
- [x] Step 0 — Finisher (Lint/Prettier, Sentry, EAS Updates, Icons)
- [x] Step 1 — Routing skeleton & screens
- [x] Step 2 — Skia board (tap-to-move)
- [x] Step 3 — AI mock reply + swap/undo/reset

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
 - Chessboard: Tap a piece to see legal dots; tap target to move.
