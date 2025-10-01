# 🚀 Pre-Build Checklist - Native Stockfish Module

## ✅ **Critical Files Verified**

### Git Status
- ✅ All changes committed
- ✅ Latest commit: `551a8d0 fix: Add custom Podfile to manually link StockfishJSI pod`
- ✅ Branch: main, up to date with origin

### Stockfish Submodule
- ✅ Location: `packages/react-native-stockfish-jsi/cpp/stockfish`
- ✅ Commit: `03e27488 Stockfish 17.1` (correct tag: sf_17.1)
- ✅ Status: Clean working tree
- ✅ Git submodules file configured correctly

### NNUE Neural Network Files
- ✅ iOS: `packages/react-native-stockfish-jsi/ios/stockfish.nnue` (61.5 MB)
- ✅ Android: `packages/react-native-stockfish-jsi/android/src/main/assets/stockfish.nnue` (61.5 MB)
- ✅ Both files committed to git

### iOS Configuration
- ✅ `ios/Podfile` exists and committed
- ✅ `ios/Podfile.properties.json` exists and committed
- ✅ Manual pod reference: `pod 'StockfishJSI', :path => '../packages/react-native-stockfish-jsi/ios'`
- ✅ Podspec: `packages/react-native-stockfish-jsi/ios/StockfishJSI.podspec` committed

### Android Configuration  
- ✅ `android/` folder committed
- ✅ Native module build config in place

### EAS Build Hooks
- ✅ `.eas/hooks/postClone.sh` exists and committed
- ✅ Hook content verified (clones git submodules)
- ✅ Proper shebang: `#!/usr/bin/env bash`

### Package Configuration
- ✅ `package.json` has `"react-native-stockfish-jsi": "workspace:*"`
- ✅ `react-native.config.js` declares the native module
- ✅ `pnpm-workspace.yaml` includes packages folder

---

## 🎯 **Expected Build Behavior**

### What SHOULD Happen:
1. **Clone**: EAS clones repo with all files
2. **PostClone Hook**: Runs and clones Stockfish submodule
   - Should see: "🔄 Initializing git submodules..."
   - Should see: "✅ Submodules initialized successfully"
3. **Install Dependencies**: `pnpm install` installs workspace package
   - Should see: `+ react-native-stockfish-jsi 0.1.0 <- packages/react-native-stockfish-jsi`
4. **Prebuild iOS**: EAS runs `expo prebuild --platform ios`
   - Uses your custom `ios/Podfile` (doesn't overwrite it)
5. **Pod Install**: Runs with your custom Podfile
   - Should see: **"Installing StockfishJSI"** ← KEY LINE!
   - Should see Stockfish sources being compiled
6. **Xcode Build**: Compiles everything including Stockfish C++
   - Should take **15-20 minutes** (not 6 minutes)
   - Stockfish compilation is slow (this is GOOD!)

### What to Look For in Logs:
```
✅ "🔄 Initializing git submodules..."
✅ "+ react-native-stockfish-jsi 0.1.0"
✅ "Installing StockfishJSI"
✅ "Compiling Stockfish sources..."
✅ Total build time: 15-20 minutes
```

### Red Flags (If These Happen):
```
❌ No output from postClone hook
❌ Only 12 modules found (should be 13+)
❌ "StockfishJSI" NOT in pod install output
❌ Build completes in < 10 minutes
```

---

## 📋 **Manual Checks to Run**

### 1. Run Expo Doctor
```bash
npx expo-doctor@latest
```

**Expected:**
- Warning about native folders is OK (we need them for Podfile)
- No other critical errors

### 2. Verify Git Remote
```bash
git remote -v
```

**Expected:**
- origin points to your GitHub repo

### 3. Check EAS Account
```bash
eas whoami
```

**Expected:**
- Shows your account name
- Has remaining build credits

---

## 🚀 **Ready to Build Command**

```bash
eas build --profile development --platform ios
```

---

## 📊 **Post-Build Verification**

### After Build Completes:
1. Download and install the `.ipa` on your iPhone
2. Open the app
3. Go to AI Setup screen
4. Look for console logs:
   ```
   ✅ [EngineManager] Native Stockfish loaded
   ✅ Stockfish 17.1 by the Stockfish developers
   ✅ [AI Setup] Engine ready in <100ms
   ```
5. Badge should show **"Native Engine"** with green dot
6. AI moves should come back in **<500ms**

### Test Commands (in console):
```javascript
// Should see native engine
console.log(global.StockfishJSI)

// Should complete in <2 seconds
await window.__engineTest(16)
```

---

## ✅ **All Checks Passed!**

Everything is configured correctly and ready for build.

**Next step:** Run `expo-doctor` then trigger the EAS build!

