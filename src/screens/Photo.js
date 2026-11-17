import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BackIcon, Masonry, PillButton } from '../components';
import { SWEEP_IN } from '../motion';
import { imageFor, largeImageFor, sameTimePeriod, similarSubject } from '../library';
import { COLORS, FONTS, s, T, useFit } from '../theme';

const BATCH = 12;
const LINES = 4; // text blocks show this many lines until "More"

// A block of text that shows LINES lines, with More/Less once it runs longer.
function Expandable({ label, text, children }) {
  const [open, setOpen] = useState(false);
  // Long text gets "More" straight away; onTextLayout confirms it on phones (web doesn't fire it).
  const [long, setLong] = useState(text.length > 170);
  return (
    <View style={styles.block}>
      <T style={styles.label}>{label}</T>
      <T style={styles.blockText} numberOfLines={open ? undefined : LINES}
        onTextLayout={({ nativeEvent }) => { if (!open && nativeEvent.lines.length >= LINES) setLong(true); }}>
        {text}
      </T>
      {long && (
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={s(8)}>
          <T style={styles.more}>{open ? 'Less' : 'More'}</T>
        </Pressable>
      )}
      {children}
    </View>
  );
}

// What the archive says about the photo, the Wikipedia summary of its subject,
// catalogue details, and subjects that open a search.
function Context({ photo, onSearch }) {
  const c = photo.ctx || {};
  const rows = [
    ['Medium', c.medium],
    ['Place', c.place],
    ['Collection', c.coll?.name, c.coll?.url],
    ['Credit', c.credit],
  ].filter(([, v]) => v);
  if (!c.about && !c.wiki && !rows.length && !c.subjects?.length) return null;
  return (
    <View style={styles.ctx}>
      {!!c.about && (
        <Expandable key={`a-${photo.id}`} label={photo.source === 'Public Domain Image Archive' && c.coll ? 'About the collection' : photo.id.startsWith('ix-') ? 'From the Index of Medieval Art' : 'About this photo'} text={c.about} />
      )}
      {!!c.wiki && (
        <Expandable key={`w-${photo.id}`} label={`About ${c.wiki.name}`} text={c.wiki.text}>
          <Pressable onPress={() => Linking.openURL(c.wiki.url)} accessibilityRole="link" style={styles.src}>
            <T style={styles.srcText}>From Wikipedia ↗</T>
          </Pressable>
        </Expandable>
      )}
      {rows.length > 0 && (
        <View style={styles.rows}>
          {rows.map(([k, v, url]) => (
            <View key={k} style={styles.row}>
              <T style={styles.rowKey}>{k}</T>
              {url ? (
                <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" style={styles.rowVal}>
                  <T style={[styles.rowText, styles.underline]}>{v} ↗</T>
                </Pressable>
              ) : (
                <T style={[styles.rowText, styles.rowVal]}>{v}</T>
              )}
            </View>
          ))}
        </View>
      )}
      {!!c.subjects?.length && (
        <View>
          <T style={styles.label}>Subjects</T>
          <View style={styles.tags}>
            {c.subjects.map((t) => (
              <Pressable key={t} onPress={() => onSearch?.(t)} accessibilityRole="button" accessibilityLabel={`Search for ${t}`} style={styles.tag}>
                <T style={styles.tagText}>{t}</T>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <View style={styles.rule} />
    </View>
  );
}

export default function Photo({ photo, saved, onBack, onSave, onOpenPhoto, onSearch }) {
  const { barShift } = useFit();
  const scroll = useRef(null);
  const [tab, setTab] = useState(photo.year ? 'time' : 'subject');
  const [count, setCount] = useState(BATCH);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [photo.id]);

  // Work out the related photos only once the page has finished sweeping in,
  // so that heavy work never makes the motion stutter.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Wait out the sweep-in, then use the next idle moment. (InteractionManager is gone from
    // React Native; requestIdleCallback is its replacement where available.)
    let idle = null;
    const timer = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(() => setReady(true), { timeout: 300 });
      else setReady(true);
    }, SWEEP_IN.duration);
    return () => {
      clearTimeout(timer);
      if (idle !== null && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
    };
  }, []);
  const matches = useMemo(() => (!ready ? [] : tab === 'time' ? sameTimePeriod(photo) : similarSubject(photo)), [ready, photo, tab]);
  const meta = [photo.dateText || photo.year, photo.who].filter(Boolean).join(' · ');

  const choose = (next) => {
    setTab(next);
    setCount(BATCH);
  };
  const loadMoreNearEnd = ({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
    if (contentOffset.y + layoutMeasurement.height > contentSize.height - s(500)) {
      setCount((c) => Math.min(c + BATCH, matches.length));
    }
  };

  return (
    <View style={[styles.root, { top: 0 - s(barShift) }]}>
      <ScrollView ref={scroll} style={styles.scroll} showsVerticalScrollIndicator={false} onScroll={loadMoreNearEnd} scrollEventThrottle={200}>
        <Image source={largeImageFor(photo)} placeholder={imageFor(photo)} placeholderContentFit="cover" style={styles.hero} contentFit="cover" recyclingKey={photo.id} transition={200} accessibilityLabel={photo.title} />
        <View style={styles.info}>
          <T style={styles.title}>{photo.title}</T>
          <T style={styles.meta}>{meta}</T>
          {!!photo.link && (
            <Pressable onPress={() => Linking.openURL(photo.link)} accessibilityRole="link">
              <T style={styles.link}>{photo.source} ↗</T>
            </Pressable>
          )}
        </View>
        <Context photo={photo} onSearch={onSearch} />
        <View style={styles.tabs}>
          <Pressable onPress={() => choose('subject')} accessibilityRole="button" accessibilityState={{ selected: tab === 'subject' }} style={[styles.tab, tab === 'subject' && styles.tabOn]}>
            <T style={styles.tabText}>Similar Subject</T>
          </Pressable>
          {!!photo.year && (
            <Pressable onPress={() => choose('time')} accessibilityRole="button" accessibilityState={{ selected: tab === 'time' }} style={[styles.tab, tab === 'time' && styles.tabOn]}>
              <T style={styles.tabText}>More from {photo.year}</T>
            </Pressable>
          )}
        </View>
        <Masonry photos={matches.slice(0, count)} onPress={onOpenPhoto} />
      </ScrollView>
      <View style={styles.bar}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}><BackIcon /></Pressable>
        {/* Outline until the photo is in a folder, then blue */}
        <PillButton label="Save" on={saved} onPress={onSave} accessibilityLabel={saved ? 'Saved. Change folders' : 'Save to a folder'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.ink },
  scroll: { position: 'absolute', left: 0, right: 0, top: s(113), bottom: 0 },
  bar: { position: 'absolute', left: s(21), right: s(21), top: s(59), height: s(38), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: s(38), height: s(38), marginLeft: -s(7), alignItems: 'center', justifyContent: 'center' },
  hero: { width: s(351), height: s(400), marginHorizontal: s(21), backgroundColor: COLORS.tile, borderRadius: s(1) },
  info: { paddingTop: s(16), paddingHorizontal: s(21) },
  title: { fontFamily: FONTS.serifBold, fontSize: s(23), lineHeight: s(28) },
  meta: { marginTop: s(4), marginBottom: s(4), fontSize: s(14), color: COLORS.muted },
  link: { fontSize: s(14), textDecorationLine: 'underline' },
  ctx: { paddingTop: s(16), paddingHorizontal: s(21), gap: s(18) },
  block: {},
  label: { marginBottom: s(6), fontFamily: FONTS.sans, fontSize: s(12), lineHeight: s(16), letterSpacing: s(0.8), textTransform: 'uppercase', color: COLORS.muted },
  blockText: { fontSize: s(17), lineHeight: s(23), color: COLORS.soft },
  more: { marginTop: s(4), fontFamily: FONTS.sans, fontSize: s(15), textDecorationLine: 'underline' },
  src: { alignSelf: 'flex-start', marginTop: s(6) },
  srcText: { fontFamily: FONTS.sans, fontSize: s(14), color: COLORS.muted, textDecorationLine: 'underline' },
  rows: { gap: s(9) },
  row: { flexDirection: 'row', gap: s(12) },
  rowKey: { width: s(96), paddingTop: s(2), fontFamily: FONTS.sans, fontSize: s(12), lineHeight: s(16), letterSpacing: s(0.8), textTransform: 'uppercase', color: COLORS.muted },
  rowVal: { flex: 1 },
  rowText: { fontSize: s(15), lineHeight: s(20) },
  underline: { textDecorationLine: 'underline' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  tag: { height: s(32), paddingHorizontal: s(13), borderWidth: 1, borderColor: '#4a4a4a', borderRadius: s(16), justifyContent: 'center' },
  tagText: { fontFamily: FONTS.sans, fontSize: s(14), color: COLORS.soft },
  rule: { height: 1, backgroundColor: '#262626' },
  tabs: { flexDirection: 'row', gap: s(9), marginTop: s(16), marginBottom: s(12), marginLeft: s(20) },
  tab: { width: s(153), height: s(33), borderWidth: 0.5, borderColor: COLORS.paper, borderRadius: s(9), alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: COLORS.blue },
  tabText: { fontSize: s(19) },
});
