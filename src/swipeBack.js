import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet } from 'react-native';
import { glide, SWEEP_IN } from './motion';
import { COLORS } from './theme';

const WIDTH = Dimensions.get('window').width;
const START = 10; // px of sideways movement before the swipe takes over

// A screen that sweeps in from the right when opened and can be swiped right to go
// back. It tracks the finger exactly (no jump when the swipe starts), dims the screen
// underneath less as it moves away, and on release carries the finger's speed: a
// flick or a pull past ~40% glides it off; otherwise it glides back into place.
// backRef (optional) receives a function that sweeps this screen away, for back arrows.
export default function SwipeBack({ enabled, sweepIn, onBack, backRef, pointerEvents, children }) {
  const [x] = useState(() => new Animated.Value(sweepIn ? WIDTH : 0));
  const enabledRef = useRef(enabled);
  const onBackRef = useRef(onBack);
  const leaving = useRef(false);
  useEffect(() => { enabledRef.current = enabled; onBackRef.current = onBack; });

  useEffect(() => {
    if (sweepIn) Animated.timing(x, { toValue: 0, ...SWEEP_IN }).start();
  }, [sweepIn, x]);

  const settle = useCallback((v = 0) => {
    if (!leaving.current) Animated.spring(x, { toValue: 0, ...glide(v) }).start();
  }, [x]);
  const leave = useCallback((v = 0) => {
    if (leaving.current) return;
    leaving.current = true;
    let done = false;
    const finish = () => { if (!done) { done = true; onBackRef.current(); } };
    Animated.spring(x, { toValue: WIDTH, ...glide(Math.max(v, 0.6)) }).start(finish);
    setTimeout(finish, 700); // in case the animation is interrupted
  }, [x]);

  useEffect(() => {
    if (!backRef || !enabled) return undefined;
    backRef.current = () => leave(0);
    return () => { if (backRef.current) backRef.current = null; };
  }, [backRef, enabled, leave]);

  // Where the screen would coast to: a quick flick counts as much as a long pull.
  const release = (g) => (g.dx - START + g.vx * 180 > WIDTH * 0.4 ? leave(g.vx) : settle(g.vx));

  // The refs below are read only inside gesture handlers, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => enabledRef.current && !leaving.current && g.dx > START && g.dx > Math.abs(g.dy) * 2,
    onPanResponderGrant: () => x.stopAnimation(),
    onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx - START)),
    onPanResponderRelease: (_, g) => release(g),
    onPanResponderTerminate: (_, g) => release(g),
  }));

  const dim = x.interpolate({ inputRange: [0, WIDTH], outputRange: [0.5, 0], extrapolate: 'clamp' });

  return (
    <>
      {/* Shade over the screen underneath, lifting as this one sweeps away */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: sweepIn || enabled ? dim : 0 }]} />
      <Animated.View {...pan.panHandlers} pointerEvents={pointerEvents} style={[StyleSheet.absoluteFill, styles.screen, { transform: [{ translateX: x }] }]}>
        {children}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: '#000' },
  // Opaque, with a soft edge shadow so the screen underneath reads as "behind".
  screen: { backgroundColor: COLORS.ink, shadowColor: '#000', shadowOffset: { width: -8, height: 0 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 10 },
});
