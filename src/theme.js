import { Dimensions, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const COLORS = {
  ink: '#000',
  paper: '#fff',
  soft: '#dadada',
  muted: '#a3a3a3',
  tan: '#d5b893',
  oxblood: '#642025',
  blue: '#6a88ff',
  tile: '#1b1b1b',
  chipText: '#c4cffb',
};

export const FONTS = {
  serif: 'InriaSerif_400Regular',
  serifBold: 'InriaSerif_700Bold',
  serifItalic: 'InriaSerif_400Regular_Italic',
  serifBoldItalic: 'InriaSerif_700Bold_Italic',
  sans: 'InriaSans_400Regular',
};

// The Figma frames are 393pt wide; everything scales from that width.
const FIGMA_WIDTH = 393;
const FIGMA_HEIGHT = 852;
// In a desktop browser the app keeps phone width, centered (see source/build_web.py).
export const WEB_MAX_WIDTH = 430;
const screen = Dimensions.get('window');
const window = Platform.OS === 'web' ? { ...screen, width: Math.min(screen.width, WEB_MAX_WIDTH) } : screen;
const scale = window.width / FIGMA_WIDTH;
export const s = (n) => n * scale;

// On screens shorter than the Figma frame, spend the empty top margin first.
export function useFit() {
  const insets = useSafeAreaInsets();
  const height = window.height / scale;
  const spare = Math.max(0, FIGMA_HEIGHT - height);
  const topClear = insets.top / scale + 8;
  return {
    height,
    insets,
    shift: Math.min(70, spare, Math.max(0, 82 - topClear)),
    homeShift: Math.min(61, spare, Math.max(0, 73 - topClear)),
    barShift: Math.min(47, spare, Math.max(0, 59 - topClear)),
  };
}

export function T({ style, ...props }) {
  return <Text allowFontScaling={false} style={[{ color: COLORS.paper, fontFamily: FONTS.serif }, style]} {...props} />;
}
