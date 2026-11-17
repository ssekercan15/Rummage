import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet } from 'react-native';
import { glide, SWEEP_IN, SWEEP_OUT } from './motion';
import { COLORS, s, useFit } from './theme';

const OFFSCREEN = Dimensions.get('window').height;
const CLOSE_DISTANCE = 110; // pull further than this, or flick down, to close
const CLOSE_SPEED = 0.8;

// A bottom sheet that slides up, follows the finger when dragged down, and closes
// when pulled far enough or flicked. It can be dragged from anywhere on the sheet;
// inside a list, only once the list is scrolled to the top.
//
// children is a function: ({ close, scrollProps }) => content. Call close() for
// Cancel buttons so the sheet slides away; spread scrollProps on a ScrollView.
export default function BottomSheet({ onClose, style, children }) {
  const { insets } = useFit();
  const [y] = useState(() => new Animated.Value(OFFSCREEN));
  const scrolledDown = useRef(false);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  const settle = useCallback((v = 0) => {
    if (closing.current) return; // never pull a closing sheet back up
    Animated.spring(y, { toValue: 0, ...glide(v) }).start();
  }, [y]);
  const close = useCallback((speed) => {
    const v = typeof speed === 'number' ? speed : 0; // taps pass an event, not a speed
    if (closing.current) return;
    closing.current = true;
    let done = false;
    const finish = () => { if (!done) { done = true; onCloseRef.current(); } };
    // A flick carries its speed; a tap on Cancel sweeps out on the house curve.
    (v > 0.3 ? Animated.spring(y, { toValue: OFFSCREEN, ...glide(v) }) : Animated.timing(y, { toValue: OFFSCREEN, ...SWEEP_OUT })).start(finish);
    setTimeout(finish, 700); // in case the animation is interrupted and never reports back
  }, [y]);

  useEffect(() => { Animated.timing(y, { toValue: 0, ...SWEEP_IN }).start(); }, [y]);

  // The refs below are read only inside gesture handlers, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    // Taps still reach buttons; a clear downward drag takes over, unless a list inside is scrolled down.
    onMoveShouldSetPanResponderCapture: (_, g) => !scrolledDown.current && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
    onPanResponderGrant: () => y.stopAnimation(),
    // Track the finger from where the drag took over, so the sheet doesn't jump
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy - 6)),
    onPanResponderRelease: (_, g) => (g.dy + g.vy * 180 > CLOSE_DISTANCE || g.vy > CLOSE_SPEED ? close(g.vy) : settle(g.vy)),
    // If the system takes the gesture (e.g. a list starts scrolling), finish it the same way.
    onPanResponderTerminate: (_, g) => (g.dy > CLOSE_DISTANCE ? close(g.vy) : settle(g.vy)),
  }));

  // A list scrolls only when it is longer than its space; otherwise it would take the
  // drag for itself and the sheet couldn't be pulled down from it.
  const [listSize, setListSize] = useState({ box: 0, content: 0 });
  const scrollProps = {
    onScroll: (e) => { scrolledDown.current = e.nativeEvent.contentOffset.y > 0; },
    // iPhone: pulling a list down past its top makes it bounce; a big pull closes the sheet.
    onScrollEndDrag: (e) => { if (e.nativeEvent.contentOffset.y < -60) close(); },
    scrollEventThrottle: 32,
    scrollEnabled: listSize.content > listSize.box + 1,
    onLayout: (e) => { const box = e.nativeEvent.layout.height; setListSize((l) => (l.box === box ? l : { ...l, box })); },
    onContentSizeChange: (_, content) => setListSize((l) => (l.content === content ? l : { ...l, content })),
  };
  const scrimOpacity = y.interpolate({ inputRange: [0, OFFSCREEN * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: scrimOpacity }]}>
        <Pressable style={styles.scrim} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.sheet, { paddingBottom: Math.max(s(26), insets.bottom + s(8)), transform: [{ translateY: y }] }, style]}
      >
        {/* A taller invisible strip around the grabber makes it easy to catch */}
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={s(14)} style={styles.grabArea}>
          <Animated.View style={styles.grab} />
        </Pressable>
        {/* eslint-disable-next-line react-hooks/refs -- scrollProps only writes a ref when the list scrolls */}
        {children({ close, scrollProps })}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: { backgroundColor: COLORS.ink, borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.paper, borderTopLeftRadius: s(20), borderTopRightRadius: s(20), paddingTop: s(12), paddingHorizontal: s(22) },
  grabArea: { alignSelf: 'center', paddingVertical: s(4), marginTop: -s(4), marginBottom: s(12) },
  grab: { width: s(36), height: s(4), borderRadius: s(2), backgroundColor: COLORS.soft },
});
