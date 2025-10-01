# react-native-stockfish-jsi

Native Stockfish chess engine for React Native using JSI (JavaScript Interface).

## Features

- **Instant initialization** (<100ms vs 15-20s for browser)
- **Multi-threaded** search (up to 8 cores)
- **Full NNUE** evaluation (GM-level strength)
- **Zero JS bridge overhead** (JSI direct calls)
- **iOS & Android** support

## Installation

This is a native module. You must use a custom dev client:

```bash
# From workspace root
pnpm install

# iOS
cd ios && pod install && cd ..
npx expo run:ios

# Android  
npx expo run:android
```

## Usage

```typescript
import { NativeStockfish } from 'react-native-stockfish-jsi';

const engine = new NativeStockfish();
await engine.init({ threads: 4, hashMB: 128, skill: 20 });

engine.onMessage((line) => {
  console.log('UCI:', line);
});

engine.send('uci');
engine.send('isready');
engine.send('position startpos');
engine.send('go depth 15');

// Cleanup
engine.dispose();
```

## Build Requirements

### iOS
- Xcode 14+
- CocoaPods
- C++17 compiler

### Android
- NDK r25+
- CMake 3.18+
- Gradle 8+

## License

MIT
