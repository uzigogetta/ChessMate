import { Platform } from 'react-native';

// Wrapper to satisfy Expo Router's requirement for a non-platform-specific route file
// and to avoid importing the iOS module on Android (and vice versa).
// We use require() so the non-target platform file is never executed.
const Screen = Platform.OS === 'ios'
  ? require('./index.ios').default
  : require('./index.android').default;

export default Screen;


