# 🍎 Mac Setup Guide: Complete Native Stockfish Engine

## 📋 Current Status (As of 2025-10-01)

### ✅ What's Working:
- **Browser Engine**: Stockfish 17.1 asm.js, 15-20s init, 2-4s moves, ~2400 Elo ✅
- **Autolinking**: Native module discovered by CocoaPods ✅
- **NPM Package**: `@uzigogetta/react-native-stockfish-jsi@0.1.4` published ✅
- **App Integration**: EngineManager with auto/native/browser fallback ✅

### ⚠️ What's NOT Working:
- **Native Module C++ Compilation**: Has compilation errors ❌
- **Performance**: Browser engine is 10-20x slower than native could be ❌

### 🎯 Goal:
Fix C++ JSI bridge to compile cleanly and deliver Chess.com-level performance:
- **Init time**: <100ms (vs 15-20s browser)
- **Move time**: <300ms (vs 2-4s browser)
- **Strength**: ~3200 Elo (vs ~2400 browser)

---

## 🖥️ Mac Setup Instructions (Step-by-Step)

### **Step 1: Install Required Software**

#### 1.1 Install Xcode (Required)
```bash
# Option A: From App Store (Recommended)
1. Open App Store
2. Search "Xcode"
3. Click "Get" (it's free, ~15 GB download)
4. Wait 30-60 minutes for installation

# Option B: From Apple Developer
# Visit: https://developer.apple.com/xcode/
```

#### 1.2 Install Xcode Command Line Tools
```bash
sudo xcode-select --install
```

#### 1.3 Install Homebrew (Package Manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 1.4 Install Node.js and pnpm
```bash
brew install node@20
npm install -g pnpm
```

#### 1.5 Install Cursor
```bash
# Download from: https://cursor.sh
# Or use the installer from their website
```

---

### **Step 2: Clone and Setup Project**

```bash
# Navigate to desired location
cd ~/Desktop

# Clone the repository
git clone https://github.com/uzigogetta/ChessMate.git
cd ChessMate

# Install dependencies (includes native module from npm)
pnpm install

# This will download @uzigogetta/react-native-stockfish-jsi from npm registry
```

---

### **Step 3: Initialize Git Submodule**

```bash
# The Stockfish C++ sources are in a git submodule
git submodule update --init --recursive

# Verify it downloaded
ls -la packages/react-native-stockfish-jsi/cpp/stockfish/src
# Should see: engine.cpp, uci.cpp, search.cpp, etc.
```

---

### **Step 4: Build iOS App Locally**

```bash
# Clean start (first time)
npx expo run:ios --clean

# This will:
# 1. Run expo prebuild (generate ios/ folder)
# 2. Install CocoaPods (compile native modules)
# 3. Open Xcode and build
# 4. Launch in iOS Simulator
```

**Expected first build time:** 20-30 minutes (Stockfish C++ compilation is heavy)

---

### **Step 5: Watch for Errors**

#### If Build Succeeds ✅
You'll see:
```
✅ Build succeeded
✅ Opening iOS Simulator
✅ App launches
```

**Then test in the app:**
- Go to AI Setup screen
- Should say "Start Game" in <1 second (not 15-20s)
- Play a move → AI responds in <500ms
- Check console for: `[EngineManager] Native Stockfish loaded`

#### If Build Fails ❌
You'll see detailed Xcode errors like:
```
/path/to/StockfishJSI.cpp:245:18: error: no member named 'time' in 'Stockfish::Search::InfoFull'
    oss << info.time;
           ~~~~ ^
note: did you mean 'timeMs'?
```

**Copy the ENTIRE error output and share it in Cursor.**

---

## 🔧 Common Issues & Fixes

### Issue 1: "Cannot find stockfish sources"
```bash
# Reinit submodule
git submodule update --init --recursive
cd packages/react-native-stockfish-jsi/cpp/stockfish
git checkout sf_17.1
```

### Issue 2: "Pod install failed"
```bash
cd ios
pod deintegrate
pod install --repo-update
```

### Issue 3: "Xcode version too old"
```bash
# Update Xcode from App Store to latest version
# Restart Mac after update
```

---

## 📝 Cursor Chat Template (Copy This)

When you open Cursor on the Mac, start a new chat and paste this:

```
I'm working on ChessMate, a React Native Expo chess app. I have a native 
Stockfish JSI module that needs C++ debugging.

CURRENT STATUS:
- Package: @uzigogetta/react-native-stockfish-jsi@0.1.4 (published on npm)
- Autolinking: Works! (module discovered by CocoaPods)
- C++ Code: Has compilation errors when building on iOS
- Location: packages/react-native-stockfish-jsi/cpp/StockfishJSI.cpp

GOAL:
Fix C++ compilation errors to achieve:
- <100ms initialization (vs 15-20s browser engine)
- <300ms move time (vs 2-4s browser)
- ~3200 Elo strength (vs ~2400 browser)
- Multi-threaded NNUE evaluation

KEY FILES:
- packages/react-native-stockfish-jsi/cpp/StockfishJSI.cpp (JSI bridge)
- packages/react-native-stockfish-jsi/ios/StockfishJSI.mm (iOS integration)
- packages/react-native-stockfish-jsi/react-native-stockfish-jsi.podspec (build config)
- src/features/chess/engine/EngineManager.ts (engine orchestration)

STOCKFISH VERSION:
- Stockfish 17.1 (tag: sf_17.1, commit: 03e27488)
- Sources: packages/react-native-stockfish-jsi/cpp/stockfish/

FIRST STEP:
Run: npx expo run:ios

Then share any compilation errors you see. I'll fix the C++ code based on 
the actual Stockfish 17.1 API.
```

---

## 🎯 What Will Happen on Mac

### **Iteration 1:**
1. You run: `npx expo run:ios`
2. Xcode compiles → Shows detailed errors
3. You paste errors in Cursor
4. I fix the C++ code
5. Commit and push

### **Iteration 2-4:**
- Repeat until it compiles ✅
- Then test functionality
- Fix any runtime issues
- Optimize performance

### **Final:**
- Working native engine! 🎉
- Publish v1.0.0 to npm
- Update app to use it
- EAS build will work automatically

---

## 📊 Expected Results After Mac Session

| Metric | Browser (Now) | Native (After Mac) |
|--------|---------------|-------------------|
| **Init** | 15-20 seconds | <100ms |
| **Moves** | 2-4 seconds | <300ms |
| **Strength** | ~2400 Elo | ~3200 Elo |
| **Threads** | 1 | 2-8 cores |
| **Quality** | Good | Chess.com-level |

---

## 💡 Bottom Line

**On Windows (now):** I'm 70% blind, guessing at fixes, wasting build credits

**On Mac (later):** I'm 100% effective, see real errors, iterate in minutes

**The Mac unlocks my full debugging power!** 🔓💪

---

## ⏭️ Next Steps

1. **For now:** Ship with browser engine (it works!)
2. **When you get Mac:** Follow this guide, open Cursor, paste the template
3. **I'll finish the native engine:** 3-4 hours to perfection

Sound good? 🚀

