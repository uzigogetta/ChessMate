# Changelog

All notable changes since Step 8.3 are documented here.

## 2025-09-21

### Added
- Platform-specific Archive screens:
  - iOS: Reanimated + BlurView, SectionList, stacked native search, favorites section, result badges, smooth springs (gated by Reduce Motion).
  - Android: FlatList, swipe actions (Copy/Share/Delete) with react-native-gesture-handler, haptics, clipboard, search bar, filter modal.
- Accessibility:
  - High Contrast mode with role-based palette (action/info/success/warning/danger) and solid backgrounds for light/dark.
  - Reduce Motion gates indicator/summary animations to simple transitions.
  - Larger UI increases paddings/font sizes across atoms and key screens.
- Header indicators (cloud/connection) with polished animations, intro/upload/success hold, presence/grace logic, dark-mode readability, and glass capsule.
- Theming: getTheme(active, { highContrast }) and unified token usage in atoms and screens.
- Search: HC-aware search input on Android (solid bg, blue focus borders), native stacked search on iOS Archive.
- Tests: smoke tests for Supabase archive flow, archive guard; UI tests for RoomHeader/SeatControls.

### Changed
- Navigation/headers:
  - iOS headers restored to true glass (transparent + system blur), large titles on Archive.
  - Android headers opaque (no overlap), consistent spacing without per-screen hacks.
  - Tabs: iOS NativeTabs minimized on scroll; Android floating tab bar retained.
- Online archive reliability: centralized archive guard stops double-inserts for RESULT/finalize.
- SQLite robustness on Android: safe open, WebSQL-style transaction path used where needed; WAL skipped on Android.
- Skia board: PNG piece sets (Default/Native), fixed hook order; theme-aware accents for Native pieces.
- Build/entry: expo-system-ui adopted; correct import order for gesture handler and Reanimated; EAS build guidance added.

### Fixed
- Header overlap/spacing issues on AI/Local screens; now using ScrollView with automatic insets and compact top padding.
- Archive pills/badges/readability in light/dark; chips and buttons auto-adjust colors in HC.
- Hook-order issues in badges when toggling HC; hooks now unconditional.

### Removed
- Experimental persistence of last-room rejoin; restored listener behavior and removed unwanted writes.

### Docs
- Updated README and build log with Android SQLite sanity check (dbListGames) and EAS build commands.
