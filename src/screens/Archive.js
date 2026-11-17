import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { BackIcon, Masonry, PillButton } from '../components';
import { byId, imageFor, suggestionsFor } from '../library';
import { NATIVE, SWEEP_IN } from '../motion';
import { COLORS, FONTS, s, T, useFit } from '../theme';

const plural = (n) => `${n} image${n === 1 ? '' : 's'}`;
const photosOf = (collection) => collection.photos.map((id) => byId.get(id)).filter(Boolean);

function Card({ collection, onPress }) {
  const covers = photosOf(collection).slice(0, 3);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.card}>
      <View style={styles.cover}>
        {covers[0] && <Image source={imageFor(covers[0])} style={styles.coverMain} contentFit="cover" />}
        <View style={styles.coverSide}>
          {covers.slice(1).map((p) => <Image key={p.id} source={imageFor(p)} style={styles.coverSmall} contentFit="cover" />)}
        </View>
      </View>
      <T style={styles.cardName}>{collection.name}</T>
      <T style={styles.count}>{plural(collection.photos.length)}</T>
    </Pressable>
  );
}

export function Collections({ collections, onOpen, onNew }) {
  const { homeShift } = useFit();
  const total = collections.reduce((n, c) => n + c.photos.length, 0);
  return (
    <View style={[styles.root, { top: 0 - s(homeShift) }]}>
      <View style={styles.pageHead}>
        <T style={styles.pageTitle}>Archive</T>
        <PillButton label="+ New" onPress={onNew} accessibilityLabel="New collection" />
      </View>
      <T style={styles.summary}>{collections.length} collections · {total} images</T>
      <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
        {collections.map((c, i) => <Card key={c.name} collection={c} onPress={() => onOpen(i)} />)}
      </ScrollView>
    </View>
  );
}

// A soft black fade (from the Figma folder frames), so photos slip under the top bar and nav.
function Fade({ height, toBottom, opacity = 1 }) {
  const id = toBottom ? 'fadeDown' : 'fadeUp';
  return (
    <Animated.View pointerEvents="none" style={[styles.fade, toBottom ? { bottom: -s(49) } : { top: 0 }, { height: s(height), opacity }]}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1={toBottom ? '0' : '1'} x2="0" y2={toBottom ? '1' : '0'}>
          <Stop offset="0.04" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#000" stopOpacity="0.82" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.82" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
    </Animated.View>
  );
}

const SCREEN_H = Dimensions.get('window').height;

export function Collection({ collection, onBack, onOpenPhoto, onAdd }) {
  const { barShift } = useFit();
  const photos = photosOf(collection);

  // Keep Rummaging: worked out once the page has swept in, from the folder as it was opened;
  // photos added with "+" then drop out of the list.
  const [suggested, setSuggested] = useState([]);
  const seedIds = useRef(collection.photos);
  useEffect(() => {
    let idle = null;
    const timer = setTimeout(() => {
      const run = () => setSuggested(suggestionsFor(seedIds.current));
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(run, { timeout: 300 });
      else run();
    }, SWEEP_IN.duration);
    return () => {
      clearTimeout(timer);
      if (idle !== null && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
    };
  }, []);
  const suggestions = suggested.filter((p) => !collection.photos.includes(p.id));

  // Suggestions start faded (54%) and come up to full as they scroll into view.
  const [scrollY] = useState(() => new Animated.Value(0));
  const [sectionY, setSectionY] = useState(0);
  const sectionOpacity = scrollY.interpolate({
    inputRange: [Math.max(0, sectionY - SCREEN_H * 0.75), Math.max(1, sectionY - SCREEN_H * 0.4)],
    outputRange: [0.54, 1],
    extrapolate: 'clamp',
  });
  const years = photos.map((p) => p.year).filter(Boolean);
  const range = years.length ? ` · ${Math.min(...years)}–${Math.max(...years)}` : '';

  const share = () => {
    const links = photos.map((p) => p.link).filter(Boolean);
    Share.share({ message: [collection.name, ...links].join('\n') }).catch(() => {});
  };

  return (
    <View style={[styles.root, { top: 0 - s(barShift) }]}>
      <Animated.ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE })}
      >
        <T style={styles.colTitle}>{collection.name}</T>
        <T style={styles.colMeta}>{plural(photos.length)}{range}</T>
        <Masonry photos={photos} onPress={onOpenPhoto} style={styles.folderGrid} />
        {suggestions.length > 0 && (
          <Animated.View onLayout={(e) => setSectionY(e.nativeEvent.layout.y)} style={{ opacity: sectionOpacity }}>
            <T style={styles.keep}>Keep Rummaging</T>
            <Masonry photos={suggestions} onPress={onOpenPhoto} onAdd={onAdd} />
          </Animated.View>
        )}
      </Animated.ScrollView>
      {/* Top fade appears once the page scrolls; the bottom one sits behind the nav */}
      <Fade height={164} opacity={scrollY.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: 'clamp' })} />
      <Fade height={159} toBottom />
      <View style={styles.bar}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}><BackIcon /></Pressable>
        <PillButton label="Share" onPress={share} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.ink },
  pageHead: { position: 'absolute', left: s(21), right: s(21), top: s(69), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontFamily: FONTS.serifBold, fontSize: s(30) },
  summary: { position: 'absolute', left: s(21), top: s(111), fontSize: s(14), color: COLORS.muted },
  cardScroll: { position: 'absolute', left: 0, right: 0, top: s(145), bottom: 0 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', columnGap: s(17), rowGap: s(20), paddingLeft: s(21), paddingBottom: s(120), alignItems: 'flex-start' },
  card: { width: s(168) },
  cover: { flexDirection: 'row', gap: s(2), height: s(168), borderRadius: s(8), overflow: 'hidden', backgroundColor: COLORS.tile },
  coverMain: { width: s(111), height: s(168) },
  coverSide: { width: s(55), gap: s(2) },
  coverSmall: { width: s(55), height: s(83) },
  cardName: { marginTop: s(8), fontSize: s(18), lineHeight: s(22) },
  count: { fontSize: s(13), color: COLORS.muted },
  bar: { position: 'absolute', left: s(21), right: s(21), top: s(59), height: s(38), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: s(38), height: s(38), marginLeft: -s(7), alignItems: 'center', justifyContent: 'center' },
  // Scrolls under the top bar (behind a fade) rather than stopping below it
  detailScroll: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  detailContent: { paddingTop: s(113) },
  fade: { position: 'absolute', left: 0, right: 0 },
  colTitle: { fontFamily: FONTS.serifBold, fontSize: s(29), lineHeight: s(35), paddingHorizontal: s(21) },
  folderGrid: { paddingBottom: s(52) },
  keep: { paddingHorizontal: s(21), paddingBottom: s(11), fontSize: s(14), color: '#bebebe' },
  colMeta: { paddingTop: s(5), paddingBottom: s(16), paddingHorizontal: s(21), fontSize: s(14), color: COLORS.muted },
});
