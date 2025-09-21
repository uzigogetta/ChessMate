import { useFont } from '@shopify/react-native-skia';

// Path must be a static require for Skia bundling
// Temporary chess glyphs font (placeholders). Replace with final set later.
// If not present, we will fall back to Inter for layout safety.
export const usePieceFont = (size: number) => {
  const font = useFont(require('./fonts/Inter-Medium.ttf'), size);
  return font;
};


