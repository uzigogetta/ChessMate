import { useFont } from '@shopify/react-native-skia';

// Path must be a static require for Skia bundling
export const usePieceFont = (size: number) =>
  useFont(require('./fonts/Inter-Medium.ttf'), size);


