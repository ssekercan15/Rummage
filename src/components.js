import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { MARK_OVER, MARK_UNDER } from './data/icons';
import { imageFor } from './library';
import { COLORS, s, T, useFit } from './theme';

function Gradients() {
  return (
    <Defs>
      <LinearGradient id="g0" x1="59.2" y1="67.4" x2="59.2" y2="171" gradientUnits="userSpaceOnUse">
        <Stop offset="0.18" stopColor="#18267C" /><Stop offset="0.37" stopColor="#878EBB" /><Stop offset="0.64" stopColor="#E1E3EE" /><Stop offset="1" stopColor="#fff" />
      </LinearGradient>
      <LinearGradient id="g1" x1="127.6" y1="89.4" x2="126.5" y2="145" gradientUnits="userSpaceOnUse">
        <Stop offset="0.14" stopColor="#18267C" /><Stop offset="0.34" stopColor="#878EBB" /><Stop offset="0.62" stopColor="#E1E3EE" /><Stop offset="1" stopColor="#fff" />
      </LinearGradient>
      <LinearGradient id="g2" x1="92.1" y1="25.6" x2="89.8" y2="1.9" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#18267C" /><Stop offset="1" stopColor="#fff" />
      </LinearGradient>
    </Defs>
  );
}

// The stacked-books logo; `parts` lets the splash animate the two books separately.
export function Mark({ width, height, parts = ['under', 'over'] }) {
  const paths = [...(parts.includes('under') ? MARK_UNDER : []), ...(parts.includes('over') ? MARK_OVER : [])];
  return (
    <Svg width={width} height={height} viewBox="0 0 159 125" fill="none">
      <Gradients />
      {paths.map((p) => <Path key={p.d.slice(0, 24)} d={p.d} fill={p.fill} />)}
    </Svg>
  );
}

export function BackIcon() {
  return (
    <Svg width={s(24)} height={s(24)} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth={1.5} />
    </Svg>
  );
}

export function PillButton({ label, on, onPress, style, accessibilityLabel }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} style={[styles.pill, on && styles.pillOn, style]}>
      <T style={styles.pillText}>{label}</T>
    </Pressable>
  );
}

export function PhotoTile({ photo, height, onPress }) {
  return (
    <Pressable onPress={() => onPress(photo.id)} accessibilityRole="imagebutton" accessibilityLabel={photo.title} style={[styles.tile, { height: s(height) }]}>
      <Image source={imageFor(photo)} style={styles.fillImage} contentFit="cover" recyclingKey={photo.id} transition={150} />
    </Pressable>
  );
}

const HEIGHTS = [[220, 160, 240], [150, 250, 200]];

export function Masonry({ photos, onPress }) {
  const cols = [[], []];
  photos.forEach((p, i) => cols[i % 2].push(p));
  return (
    <View style={styles.masonry}>
      {cols.map((col, c) => (
        <View key={c} style={styles.column}>
          {col.map((p, i) => <PhotoTile key={p.id} photo={p} height={HEIGHTS[c][i % 3]} onPress={onPress} />)}
        </View>
      ))}
    </View>
  );
}

export function BottomNav({ active, onExplore, onArchive }) {
  const { insets } = useFit();
  return (
    <View style={[styles.nav, { bottom: Math.max(s(27), insets.bottom) }]}>
      <Pressable style={[styles.navItem, { paddingLeft: s(25) }]} onPress={onExplore} accessibilityRole="button">
        <T style={[styles.navText, active === 'explore' && styles.navOn]}>Explore</T>
      </Pressable>
      <Pressable style={[styles.navItem, { paddingLeft: s(42) }]} onPress={onArchive} accessibilityRole="button">
        <T style={[styles.navText, active === 'archive' && styles.navOn]}>Archive</T>
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  pill: { height: s(38), minWidth: s(80), paddingHorizontal: s(16), borderWidth: 1, borderColor: COLORS.paper, borderRadius: s(19), alignItems: 'center', justifyContent: 'center' },
  // Primary / saved state, per the Figma Button component: blue fill, white border.
  pillOn: { backgroundColor: COLORS.blue, borderColor: COLORS.paper },
  pillText: { fontSize: s(19) },
  fillImage: { width: '100%', height: '100%' },
  tile: { width: s(168), backgroundColor: COLORS.tile, borderRadius: s(1), overflow: 'hidden' },
  masonry: { flexDirection: 'row', gap: s(15), paddingHorizontal: s(21), paddingBottom: s(130), alignItems: 'flex-start' },
  column: { gap: s(11) },
  nav: { position: 'absolute', left: s(60), width: s(275), height: s(37), backgroundColor: 'rgba(0,0,0,0.73)', borderRadius: s(12), flexDirection: 'row' },
  navItem: { width: s(137.5), alignItems: 'flex-start', justifyContent: 'center' },
  navText: { fontSize: s(19) },
  navOn: { color: COLORS.tan },
});
