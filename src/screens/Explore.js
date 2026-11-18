import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Mark, PhotoTile } from '../components';
import { CATEGORIES, colorAt, shade, FULL_RANGE, MAX_YEAR, MIN_YEAR, results, searchIsRelated, spectrumImage } from '../library';
import { COLORS, FONTS, GRID_GAP, GRID_GUTTER, s, T, TILE, useFit } from '../theme';

const BATCH = 14;
// Collapsing header: the first RISE pt of scrolling folds the logo row away. The search bar
// and chips rise by RISE, the profile button drops into the search row, and the search bar
// shortens from the right to make room. The grid scrolls the same distance, so it stays
// attached to the header the whole way.
const RISE = 36;
const SEARCH_W = 338;
const SEARCH_SHORT = SEARCH_W - 31 - 10; // profile icon width + a gap
const PROFILE_DROP = 119 - RISE + (39 - 33) / 2 - 71; // from its own row to centered in the search row
const PICKER_WIDTH = 302;
const PICKER_HEIGHT = 201;
const KNOB = 27;
const RANGE_WIDTH = 263; // distance the knob centers travel
const LABEL_WIDTH = 48;
const PROMPTS = ['Atlantis', 'Lost Imperial Fabergé eggs', 'the old neighborhood', 'hand-painted signs'];

// Reports finger position as a 0–1 fraction of the element while it's dragged.
function useDrag(width, height, onMove) {
  const latest = useRef(onMove);
  latest.current = onMove;
  const start = useRef({ x: 0, y: 0 });
  return useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      start.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
      latest.current(start.current.x / width, start.current.y / height, true);
    },
    onPanResponderMove: (_, g) => latest.current((start.current.x + g.dx) / width, (start.current.y + g.dy) / height, false),
  })).current.panHandlers;
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const rgbString = (rgb) => `rgb(${rgb.join(',')})`;

function usePrompts(enabled) {
  const [text, setText] = useState('Search');
  useEffect(() => {
    if (!enabled) { setText('Search'); return undefined; }
    let word = 0, chars = 0, hold = 0, timer;
    const tick = () => {
      const current = PROMPTS[word % PROMPTS.length];
      setText(`Searching for ${current.slice(0, chars)}`);
      if (chars < current.length) { chars += 1; timer = setTimeout(tick, 70); return; }
      if (hold < 18) { hold += 1; timer = setTimeout(tick, 100); return; }
      hold = 0; chars = 0; word += 1;
      timer = setTimeout(tick, 200);
    };
    tick();
    return () => clearTimeout(timer);
  }, [enabled]);
  return text;
}

function ProfileIcon() {
  return (
    <Svg width={s(31)} height={s(33)} viewBox="0 0 31 33" fill="none" accessibilityLabel="Profile">
      <Circle cx="15.5" cy="16.5" r="14.5" stroke="#fff" strokeWidth={1.2} />
      <Circle cx="15.5" cy="12.5" r="5" stroke="#fff" strokeWidth={1.2} />
      <Path d="M6.5 27.5C7.5 22.5 11 20 15.5 20C20 20 23.5 22.5 24.5 27.5" stroke="#fff" strokeWidth={1.2} />
    </Svg>
  );
}

const CLEAR_WIDTH = 20;

function Chip({ label, width, fill, textColor, onPress, onClear, selected }) {
  const color = textColor || COLORS.chipText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { width: s(width + (onClear ? CLEAR_WIDTH : 0)) }, fill && { backgroundColor: fill }]}
    >
      <T style={[styles.chipText, { color }]}>{label}</T>
      {onClear && (
        <Pressable onPress={onClear} hitSlop={s(10)} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
          <Svg width={s(12)} height={s(12)} viewBox="0 0 12 12" fill="none">
            <Path d="M2 2L10 10M10 2L2 10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </Pressable>
      )}
    </Pressable>
  );
}

function ApplyButton({ onPress, top, left }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.apply, { top: s(top), left: s(left) }]}>
      <T style={styles.applyText}>Apply</T>
    </Pressable>
  );
}

function TimePanel({ range, setRange, onApply }) {
  const grabbed = useRef(0);
  // A typed year narrows the range to that one year; dragging a knob clears the box.
  const [yearText, setYearText] = useState('');
  const typeYear = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setYearText(digits);
    const y = Number(digits);
    if (digits.length === 4 && y >= MIN_YEAR && y <= MAX_YEAR) setRange([y, y]);
  };
  const pan = useDrag(s(RANGE_WIDTH + KNOB), 1, (fx, _, isStart) => {
    const frac = clamp01((fx * (RANGE_WIDTH + KNOB) - KNOB / 2) / RANGE_WIDTH);
    const year = Math.round(MIN_YEAR + frac * (MAX_YEAR - MIN_YEAR));
    setYearText('');
    setRange(([a, b]) => {
      if (isStart) grabbed.current = Math.abs(year - a) <= Math.abs(year - b) ? 0 : 1;
      return grabbed.current === 0 ? [Math.min(year, b), b] : [a, Math.max(year, a)];
    });
  });

  const xOf = (year) => ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * RANGE_WIDTH;
  const lo = xOf(range[0]);
  const hi = xOf(range[1]);
  // Keep the two year labels from sitting on top of each other.
  const push = Math.max(0, (LABEL_WIDTH - (hi - lo)) / 2);

  return (
    <View style={[styles.panel, styles.timePanel]}>
      <T style={styles.rangeTitle}>Select a time period or a year to discover</T>
      {range[0] === range[1] ? (
        <T style={[styles.rangeLabel, { left: s(35.5 + lo - LABEL_WIDTH / 2) }]}>{range[0]}</T>
      ) : (
        <>
          <T style={[styles.rangeLabel, { left: s(35.5 + lo - push - LABEL_WIDTH / 2) }]}>{range[0]}</T>
          <T style={[styles.rangeLabel, { left: s(35.5 + hi + push - LABEL_WIDTH / 2) }]}>{range[1]}</T>
        </>
      )}
      <View style={styles.rangeArea} {...pan} accessibilityLabel={`Years ${range[0]} to ${range[1]}`} accessibilityRole="adjustable">
        <View pointerEvents="none" style={styles.rangeTrack} />
        <View pointerEvents="none" style={[styles.rangeFill, { left: s(KNOB / 2 + lo), width: s(hi - lo) }]} />
        <View pointerEvents="none" style={[styles.rangeKnob, { left: s(lo) }]} />
        <View pointerEvents="none" style={[styles.rangeKnob, { left: s(hi) }]} />
      </View>
      <View style={styles.yearBox}>
        <TextInput
          style={styles.yearInput}
          value={yearText}
          onChangeText={typeYear}
          onSubmitEditing={onApply}
          placeholder="Year"
          placeholderTextColor="#5c5c5c"
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={4}
          allowFontScaling={false}
          accessibilityLabel="Year"
        />
      </View>
      <ApplyButton onPress={onApply} top={201} left={27} />
    </View>
  );
}

const VALUE_WIDTH = 302;
const HANDLE = 3;

function ColorPanel({ draft, setDraft, onApply }) {
  const { mode, pick, rgb, value } = draft;
  const isColor = mode === 'color';
  const isBW = mode === 'bw';
  const pan = useDrag(s(PICKER_WIDTH), s(PICKER_HEIGHT), (fx, fy) => {
    const next = { x: clamp01(fx), y: clamp01(fy) };
    setDraft((d) => ({ ...d, pick: next, rgb: shade(colorAt(next), d.value) }));
  });
  const valuePan = useDrag(s(VALUE_WIDTH), 1, (fx) => {
    const v = clamp01(fx);
    setDraft((d) => ({ ...d, value: v, rgb: shade(colorAt(d.pick), v) }));
  });
  const base = colorAt(pick);
  const setMode = (m) => setDraft((d) => ({ ...d, mode: d.mode === m ? null : m }));

  return (
    <View style={[styles.panel, { height: s(isColor ? 454 : 150) }]}>
      <Pressable onPress={() => setMode('bw')} accessibilityRole="button" accessibilityState={{ selected: isBW }} style={[styles.mode, styles.bw, isBW && { backgroundColor: COLORS.blue }]}>
        <T style={styles.modeText}>B&W</T>
      </Pressable>
      <Pressable onPress={() => setMode('color')} accessibilityRole="button" accessibilityState={{ selected: isColor }} style={[styles.mode, styles.color, isColor && { backgroundColor: rgbString(rgb) }]}>
        <T style={[styles.modeText, isColor && { color: COLORS.ink }]}>Color</T>
      </Pressable>
      {isColor && (
        <>
          <View style={styles.spectrum} {...pan} accessibilityLabel="Choose a color">
            <Image pointerEvents="none" source={spectrumImage} style={styles.spectrumImage} resizeMode="stretch" />
            <View pointerEvents="none" style={[styles.pick, { left: pick.x * s(PICKER_WIDTH) - s(KNOB / 2), top: pick.y * s(PICKER_HEIGHT) - s(KNOB / 2) }]} />
          </View>
          {/* Value: from near-black to the picked color */}
          <View style={styles.valueArea} {...valuePan} accessibilityLabel="Choose how dark the color is" accessibilityRole="adjustable">
            <Svg pointerEvents="none" width={s(VALUE_WIDTH)} height={s(32)} style={styles.valueBar}>
              <Defs>
                <LinearGradient id="value" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={rgbString(shade(base, 0))} />
                  <Stop offset="1" stopColor={rgbString(base)} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={s(VALUE_WIDTH)} height={s(32)} fill="url(#value)" />
            </Svg>
            <View pointerEvents="none" style={[styles.valueHandle, { left: s(value * (VALUE_WIDTH - HANDLE - 2)) }]} />
          </View>
        </>
      )}
      <ApplyButton onPress={onApply} top={isColor ? 378 : 81} left={17} />
    </View>
  );
}

export default function Explore({ filters, setFilters, promptsOn, setPromptsOn, onOpenPhoto, onPickCategory, onOpenProfile, onHome }) {
  const { homeShift } = useFit();
  const [panel, setPanel] = useState(null); // 'color' | 'time' | null
  const [colorDraft, setColorDraft] = useState(null);
  const [rangeDraft, setRangeDraft] = useState(FULL_RANGE);
  const [count, setCount] = useState(BATCH);
  const listRef = useRef(null);
  // How far the header has folded (0 open, 1 folded), following the grid's scroll.
  const [scrollY] = useState(() => new Animated.Value(0));
  const collapse = useMemo(() => scrollY.interpolate({ inputRange: [0, RISE], outputRange: [0, 1], extrapolate: 'clamp' }), [scrollY]);
  const rise = useMemo(() => collapse.interpolate({ inputRange: [0, 1], outputRange: [0, -s(RISE)] }), [collapse]);
  // Once the logo has faded, it stops taking taps.
  const [logoHidden, setLogoHidden] = useState(false);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => setLogoHidden(value > RISE * 0.5));
    return () => scrollY.removeListener(id);
  }, [scrollY]);
  const placeholder = usePrompts(promptsOn);

  const deferred = useDeferredValue(filters);
  const shown = useMemo(() => results(deferred), [deferred]);
  const related = useMemo(() => searchIsRelated(deferred), [deferred]);
  useEffect(() => {
    setCount(BATCH);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [shown]);

  // Panels edit a draft: nothing changes in the grid until Apply, and tapping away discards it.
  const togglePanel = (name) => {
    if (panel === name) { setPanel(null); return; }
    setColorDraft({ mode: filters.mode ?? 'color', pick: filters.pick, value: filters.value ?? 1, rgb: filters.rgb });
    setRangeDraft(filters.range);
    setPanel(name);
  };
  const applyColor = () => { setFilters((f) => ({ ...f, ...colorDraft })); setPanel(null); };
  const applyRange = () => { setFilters((f) => ({ ...f, range: rangeDraft })); setPanel(null); };
  const toggleCategory = (label) => {
    if (!filters.cats.includes(label)) onPickCategory(label);
    setFilters((f) => ({ ...f, cats: f.cats.includes(label) ? f.cats.filter((c) => c !== label) : [...f.cats, label] }));
  };
  const clearColor = () => {
    setFilters((f) => ({ ...f, mode: null }));
    if (panel === 'color') setPanel(null);
  };
  const clearRange = () => {
    setFilters((f) => ({ ...f, range: FULL_RANGE }));
    setRangeDraft(FULL_RANGE);
    if (panel === 'time') setPanel(null);
  };
  const more = count < shown.length;

  const colorState = panel === 'color' ? colorDraft : filters;
  const colorChip = colorState.mode === 'bw'
    ? { label: 'B&W', fill: COLORS.blue, textColor: COLORS.paper }
    // Selected filter chips are all the same blue; the picked color shows inside the panel.
    : { label: 'Color', fill: colorState.mode === 'color' ? COLORS.blue : null, textColor: colorState.mode === 'color' ? COLORS.paper : null };
  const isNarrowed = ([a, b]) => a !== FULL_RANGE[0] || b !== FULL_RANGE[1];
  const rangeSet = isNarrowed(panel === 'time' ? rangeDraft : filters.range);
  const timeOn = panel === 'time' || rangeSet;

  // Applied filters move to the front of the row so they're always in view.
  const chips = [
    { key: 'color', on: filters.mode !== null, width: 92, selected: colorState.mode !== null, onPress: () => togglePanel('color'), onClear: colorState.mode !== null ? clearColor : null, ...colorChip },
    { key: 'time', on: isNarrowed(filters.range), label: 'Time Period', width: 134, selected: timeOn, fill: timeOn ? COLORS.blue : null, textColor: timeOn ? COLORS.paper : null, onPress: () => togglePanel('time'), onClear: rangeSet ? clearRange : null },
    ...CATEGORIES.map((c) => {
      const on = filters.cats.includes(c.label);
      return { key: c.label, on, label: c.label, width: c.width, selected: on, fill: on ? COLORS.blue : null, textColor: on ? COLORS.paper : null, onPress: () => toggleCategory(c.label), onClear: on ? () => toggleCategory(c.label) : null };
    }),
  ];
  const orderedChips = [...chips.filter((c) => c.on), ...chips.filter((c) => !c.on)];

  return (
    <View style={[styles.root, { top: 0 - s(homeShift) }]}>
      <Animated.FlatList
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        // JS-driven: the search bar's width and the header's height can't run on the native driver
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        ref={listRef}
        style={styles.list}
        data={shown.slice(0, count)}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        initialNumToRender={8}
        renderItem={({ item }) => <PhotoTile photo={item} height={TILE} onPress={onOpenPhoto} />}
        onEndReached={() => setCount((c) => Math.min(c + BATCH, shown.length))}
        onEndReachedThreshold={1.2}
        ListHeaderComponent={related && shown.length ? <T style={styles.related}>No exact matches for “{deferred.q.trim()}”. Showing related images.</T> : null}
        ListEmptyComponent={<T style={styles.empty}>{deferred.q.trim() ? `Nothing like “${deferred.q.trim()}” in the archive yet. Try another word.` : 'Nothing in this sample matches. Try another year or filter.'}</T>}
        ListFooterComponent={more ? <T style={styles.more}>Rummaging around…</T> : null}
        keyboardShouldPersistTaps="handled"
      />

      <Animated.View style={[styles.head, { height: collapse.interpolate({ inputRange: [0, 1], outputRange: [s(217), s(217 - RISE)] }) }]} pointerEvents="none" />
      {/* The logo takes you home: filters and search cleared, back to the top. It rises and fades as the header folds. */}
      <Animated.View
        pointerEvents={logoHidden ? 'none' : 'auto'}
        style={[styles.brand, {
          opacity: collapse.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
          transform: [{ translateY: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, -s(RISE + 8)] }) }],
        }]}
      >
        <Pressable onPress={() => { setPanel(null); onHome(); }} accessibilityRole="button" accessibilityLabel="Rummage home" hitSlop={s(8)} style={styles.brandRow}>
          <Mark width={s(35)} height={s(28)} />
          <T style={styles.brandText}>Rummage</T>
        </Pressable>
      </Animated.View>
      <Animated.View style={[styles.profile, { transform: [{ translateY: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, s(PROFILE_DROP)] }) }] }]}>
        <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Your topics" hitSlop={s(8)}>
          <ProfileIcon />
        </Pressable>
      </Animated.View>

      {panel && <Pressable style={styles.scrim} onPress={() => setPanel(null)} accessibilityLabel="Close filters" />}
      {panel && (
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: rise }] }]}>
          {panel === 'time' && <TimePanel range={rangeDraft} setRange={setRangeDraft} onApply={applyRange} />}
          {panel === 'color' && <ColorPanel draft={colorDraft} setDraft={setColorDraft} onApply={applyColor} />}
        </Animated.View>
      )}

      <Animated.View style={[styles.searchBox, {
        width: collapse.interpolate({ inputRange: [0, 1], outputRange: [s(SEARCH_W), s(SEARCH_SHORT)] }),
        transform: [{ translateY: rise }],
      }]}>
        <TextInput
          style={styles.input}
          value={filters.q}
          onChangeText={(q) => setFilters((f) => ({ ...f, q }))}
          onFocus={() => { setPromptsOn(false); setPanel(null); }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.soft}
          returnKeyType="search"
          autoCorrect={false}
          allowFontScaling={false}
          accessibilityLabel="Search the archives"
        />
      </Animated.View>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chips, { transform: [{ translateY: rise }] }]}
        contentContainerStyle={styles.chipsContent}
        keyboardShouldPersistTaps="handled"
      >
        {orderedChips.map(({ key, on, ...chip }) => <Chip key={key} {...chip} />)}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.ink },
  // The grid runs the full height and starts below the header, so it can scroll up under it
  list: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  row: { gap: s(GRID_GAP), marginBottom: s(GRID_GAP) },
  gridContent: { paddingTop: s(217), paddingHorizontal: s(GRID_GUTTER), paddingBottom: s(130) },
  empty: { paddingVertical: s(90), paddingHorizontal: s(24), textAlign: 'center', fontSize: s(19), lineHeight: s(26) },
  related: { fontSize: s(15), color: COLORS.muted, paddingBottom: s(10) },
  more: { textAlign: 'center', fontSize: s(15), color: COLORS.muted, paddingTop: s(8) },
  head: { position: 'absolute', left: 0, right: 0, top: 0, height: s(217), backgroundColor: COLORS.ink },
  brand: { position: 'absolute', left: s(29), top: s(73) },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: s(13) },
  brandText: { fontSize: s(32), lineHeight: s(36), fontFamily: FONTS.serifBold },
  profile: { position: 'absolute', left: s(337), top: s(71) },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  searchBox: { position: 'absolute', left: s(29), top: s(119), height: s(39), borderWidth: 0.5, borderColor: COLORS.paper, borderRadius: s(31), paddingLeft: s(22), paddingRight: s(4), justifyContent: 'center', backgroundColor: COLORS.ink },
  input: { fontFamily: FONTS.serif, fontSize: s(17), color: COLORS.soft, padding: 0 },
  chips: { position: 'absolute', left: 0, right: 0, top: s(168), height: s(39) },
  chipsContent: { paddingHorizontal: s(30), gap: s(7) },
  chip: { height: s(39), borderWidth: 0.5, borderColor: COLORS.blue, borderRadius: s(31), flexDirection: 'row', gap: s(6), alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: s(17) },
  panel: { position: 'absolute', left: s(29), top: s(215), width: s(338), backgroundColor: 'rgba(0,0,0,0.95)', borderWidth: 0.5, borderColor: COLORS.paper, borderRadius: s(20) },
  timePanel: { height: s(268) },
  rangeTitle: { position: 'absolute', left: s(27), top: s(19), fontFamily: FONTS.sans, fontSize: s(15) },
  rangeLabel: { position: 'absolute', top: s(59), width: s(LABEL_WIDTH), textAlign: 'center', fontFamily: FONTS.serifItalic, fontSize: s(19) },
  rangeArea: { position: 'absolute', left: s(22), top: s(78), width: s(RANGE_WIDTH + KNOB), height: s(44) },
  rangeTrack: { position: 'absolute', left: s(4), right: s(9), top: s(19.5), height: s(5), backgroundColor: '#4c4c4c' },
  rangeFill: { position: 'absolute', top: s(19.5), height: s(5), backgroundColor: COLORS.paper },
  yearBox: { position: 'absolute', left: s(28), top: s(142), width: s(82), height: s(41), borderWidth: 1, borderColor: '#414141', borderRadius: s(2), paddingHorizontal: s(11), justifyContent: 'center' },
  yearInput: { fontFamily: FONTS.serifItalic, fontSize: s(17), color: COLORS.paper, padding: 0 },
  rangeKnob: { position: 'absolute', top: s(8.5), width: s(KNOB), height: s(KNOB), borderRadius: s(KNOB / 2), backgroundColor: COLORS.paper },
  mode: { position: 'absolute', top: s(25), height: s(38), borderWidth: 1, borderColor: COLORS.paper, borderRadius: s(10), alignItems: 'center', justifyContent: 'center' },
  bw: { left: s(17), width: s(52) },
  color: { left: s(90), width: s(67) },
  modeText: { fontSize: s(19) },
  spectrum: { position: 'absolute', left: s(17), top: s(95), width: s(PICKER_WIDTH), height: s(PICKER_HEIGHT) },
  spectrumImage: { width: '100%', height: '100%' },
  pick: { position: 'absolute', width: s(KNOB), height: s(KNOB), borderRadius: s(KNOB / 2), backgroundColor: COLORS.paper },
  valueArea: { position: 'absolute', left: s(17), top: s(300), width: s(VALUE_WIDTH), height: s(44) },
  valueBar: { position: 'absolute', left: 0, top: s(6) },
  valueHandle: { position: 'absolute', top: s(4), width: s(HANDLE), height: s(37), borderRadius: s(2), backgroundColor: COLORS.paper },
  apply: { position: 'absolute', width: s(104), height: s(44), borderRadius: s(29), borderWidth: 1, borderColor: COLORS.paper, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: s(19) },
});
