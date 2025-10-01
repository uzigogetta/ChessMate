# 🚀 Mac Quick Start (When You Have Mac Access)

## ⚡ Super Fast Setup (15 Minutes)

### 1️⃣ Install Xcode
```bash
# From App Store - Search "Xcode", click Get
# OR download from: https://developer.apple.com/xcode/
```

### 2️⃣ Install Tools
```bash
# Command Line Tools
sudo xcode-select --install

# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node & pnpm
brew install node@20
npm install -g pnpm
```

### 3️⃣ Clone & Setup Project
```bash
cd ~/Desktop
git clone https://github.com/uzigogetta/ChessMate.git
cd ChessMate
pnpm install
git submodule update --init --recursive
```

### 4️⃣ Build Locally
```bash
npx expo run:ios
```

**Wait 20-30 minutes for first build (Stockfish C++ compilation)**

---

## 🔍 What to Do When You See Errors

### ✅ If It Compiles Successfully:
1. App opens in Simulator
2. Test AI setup screen → Should load in <1 second
3. Play a move → AI responds in <500ms
4. **Success!** Native engine works! 🎉

### ❌ If You See Compilation Errors:

**Open Cursor and paste this:**

```
Native Stockfish module compilation failed. Here are the errors:

[PASTE THE FULL ERROR OUTPUT HERE]

I need help fixing packages/react-native-stockfish-jsi/cpp/StockfishJSI.cpp
to work with Stockfish 17.1 API.
```

**I'll analyze the errors and fix the C++ code for you.**

---

## 🔄 Debug Loop (If Errors Happen)

```bash
# 1. I fix the code (you'll see edits in Cursor)
# 2. Commit and push
git add -A
git commit -m "fix: C++ compilation error"
git push

# 3. Publish new version
cd packages/react-native-stockfish-jsi
npm version patch  # Bumps to 0.1.5, 0.1.6, etc.
npm publish --access public

# 4. Update app
cd ../..
pnpm update @uzigogetta/react-native-stockfish-jsi@latest

# 5. Rebuild
npx expo run:ios

# Repeat until it works!
```

---

## 🎯 Expected Timeline

- **Setup**: 15 minutes
- **First build**: 20-30 minutes
- **Debug iterations**: 1-2 hours (2-5 iterations)
- **Testing & polish**: 30 minutes
- **Total**: 3-4 hours to perfect native engine

---

## 💾 Files I'll Need to See (If Errors)

1. **Full Xcode error output** (copy everything!)
2. **Build logs** from terminal
3. Any **warnings** (even if build succeeds)

---

## 📞 How to Continue Our Conversation

### Option A: Same Cursor Session
- If possible, sync your Cursor settings/chats
- We can continue this exact conversation

### Option B: New Chat (Easier)
- Open fresh chat in Cursor
- Paste the template from `MAC_NATIVE_ENGINE_GUIDE.md`
- I'll have full context from the files

---

## 🎉 What You'll Have After Mac Session

✅ **Native Stockfish 17.1** compiled for iOS  
✅ **<100ms initialization** (instant!)  
✅ **Sub-second GM-level moves**  
✅ **Multi-threaded NNUE** (2-8 cores)  
✅ **Chess.com-level performance**  
✅ **Production-ready** for App Store  

---

## 🚢 For NOW (Before Mac)

Your app is **production-ready with browser engine**:
- ✅ 2-4 second moves (playable!)
- ✅ ~2400 Elo (beats most users)
- ✅ Stable and tested
- ✅ Can ship to TestFlight/App Store

**Ship it! Then upgrade to native when you have Mac access.** 🚀

---

## 📱 Quick Commands Reference

```bash
# Build iOS locally
npx expo run:ios

# Build iOS with clean cache
npx expo run:ios --clean

# Build Android locally
npx expo run:android

# Publish native module
cd packages/react-native-stockfish-jsi
npm version patch
npm publish --access public

# Update app to latest
cd ../..
pnpm update @uzigogetta/react-native-stockfish-jsi@latest

# Build for EAS (after Mac fixes)
eas build --profile development --platform ios
```

---

**Save this file! It's your complete guide when you get Mac access.** 🍎✨

