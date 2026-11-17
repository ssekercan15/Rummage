import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Mark } from '../components';
import { onboardingImage } from '../library';
import { COLORS, FONTS, s, T, useFit } from '../theme';

const REASONS = [
  { label: 'Finding design inspiration', top: 273 },
  { label: 'Researching a time period', top: 361 },
  { label: 'Learning about art history', top: 448 },
  { label: 'Using it for school', top: 535 },
];

// Positions come straight from the Onboarding 7, 8 and 9 frames: [x, y, width, height].
const TOUR = [
  {
    line: 'Rummage through history, exploring real photos from public archives',
    year: '1969', tilt: '12deg', color: COLORS.blue, yearColor: '#fff', disc: [45, 370],
    cap: 'Photo from Apollo 11 mission', capY: 625,
    front: 'park',
    park: [73, 391, 247, 230], cyan: [296, 400, 271, 212], tree: [460, 406, 172, 207],
  },
  {
    line: 'Find inspiration for your next project, discovering ideas hidden in the visuals of the past.',
    year: '1906', tilt: '-7deg', color: COLORS.tan, yearColor: '#fff', disc: [298, 365],
    cap: 'East side of Washington Street, north of Kingsbury Street', capY: 629,
    front: 'cyan',
    park: [-167, 391, 247, 230], cyan: [50, 395, 294, 230], tree: [307, 406, 172, 207],
  },
  {
    line: 'Search and filter by what you’re looking for, narrowing the archives to the images you need.',
    year: '1910', tilt: '10deg', color: COLORS.oxblood, yearColor: '#fff', disc: [80, 349],
    cap: 'At the Saliuktin Mines. On the Outskirts of Samarkand', capY: 675,
    front: 'tree',
    park: [-420, 391, 247, 230], cyan: [-227, 395, 294, 230], tree: [75, 395, 229, 276],
  },
];
const STEPS = [0, 1, 2];

function Splash({ onDone, shift }) {
  const rise = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(rise, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(150),
      Animated.timing(drop, { toValue: 1, duration: 550, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(onDone, 2300);
    return () => clearTimeout(timer);
  }, []);

  const size = { width: s(159), height: s(125) };
  return (
    <Pressable style={[styles.fill, { top: 0 - s(shift / 2) }]} onPress={onDone} accessibilityLabel="Skip intro">
      <Animated.View style={[styles.mark, { transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [-s(56), 0] }) }] }]}>
        <Mark {...size} parts={['under']} />
      </Animated.View>
      <Animated.View style={[styles.mark, { opacity: drop.interpolate({ inputRange: [0, 0.2], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-s(64), 0] }) }] }]}>
        <Mark {...size} parts={['over']} />
      </Animated.View>
      <T style={styles.word}>Rummage</T>
    </Pressable>
  );
}

function Reasons({ onDone, shift }) {
  const [chosen, setChosen] = useState(null);
  const choose = (i) => {
    setChosen(i);
    setTimeout(() => onDone(i), 450);
  };
  return (
    <View style={[styles.fill, { top: 0 - s(shift) }]}>
      <T style={styles.hey}>Hey there!</T>
      <T style={styles.why}>what brought you{'\n'}to Rummage?</T>
      {REASONS.map((r, i) => (
        <Pressable key={r.label} onPress={() => choose(i)} accessibilityRole="checkbox" accessibilityState={{ checked: chosen === i }} style={[styles.reason, { top: s(r.top) }]}>
          <T style={styles.reasonText}>{r.label}</T>
          <View style={[styles.box, chosen === i && { backgroundColor: COLORS.tan }]} />
        </Pressable>
      ))}
    </View>
  );
}

function TourPhoto({ name, pos, step }) {
  const at = (i) => pos.interpolate({ inputRange: STEPS, outputRange: TOUR.map((t) => s(t[name][i])) });
  return (
    <Animated.Image
      source={onboardingImage(`onb-${name}`)}
      resizeMode="cover"
      style={{ position: 'absolute', left: at(0), top: at(1), width: at(2), height: at(3), zIndex: TOUR[step].front === name ? 2 : 1 }}
    />
  );
}

function Tour({ onDone, shift, height, insets }) {
  const [step, setStep] = useState(0);
  const pos = useRef(new Animated.Value(0)).current;
  const stepRef = useRef(0);

  const go = (next) => {
    if (next < 0 || next >= TOUR.length) return;
    stepRef.current = next;
    setStep(next);
    Animated.timing(pos, { toValue: next, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -40) go(stepRef.current + 1);
      if (g.dx > 40) go(stepRef.current - 1);
    },
  })).current;

  const t = TOUR[step];
  const discAt = (i) => pos.interpolate({ inputRange: STEPS, outputRange: TOUR.map((x) => s(x.disc[i])) });
  const dotsBottom = Math.max(24, insets.bottom + 4);

  return (
    <View style={styles.tourRoot} {...swipe.panHandlers}>
      <Pressable style={[styles.fill, { top: 0 - s(shift) }]} onPress={() => go(step + 1)} accessibilityLabel="Next">
        <T style={styles.curious}>Curious to{'\n'}dig deeper?</T>
        <T style={styles.line}>{t.line}</T>
        <TourPhoto name="park" pos={pos} step={step} />
        <TourPhoto name="cyan" pos={pos} step={step} />
        <TourPhoto name="tree" pos={pos} step={step} />
        <Animated.View style={[styles.disc, { left: discAt(0), top: discAt(1), backgroundColor: t.color }]}>
          <T style={[styles.discText, { color: t.yearColor, transform: [{ rotate: t.tilt }] }]}>{t.year}</T>
        </Animated.View>
        <T style={[styles.cap, { top: s(t.capY) }]} numberOfLines={1}>{t.cap}</T>
      </Pressable>
      {step === TOUR.length - 1 && (
        <Pressable onPress={onDone} accessibilityRole="button" style={[styles.next, { top: s(712 - shift) }]}>
          <T style={styles.nextText}>Explore</T>
        </Pressable>
      )}
      {step < TOUR.length - 1 && (
        <View pointerEvents="none" style={[styles.dots, { bottom: s(dotsBottom) }]}>
          {STEPS.map((i) => <View key={i} style={[styles.dot, i === step && { backgroundColor: COLORS.paper }]} />)}
        </View>
      )}
    </View>
  );
}

export default function Onboarding({ returning, onDone }) {
  const [stage, setStage] = useState('splash');
  const [reason, setReason] = useState(null);
  const { shift, height, insets } = useFit();
  if (stage === 'splash') return <Splash shift={shift} onDone={() => (returning ? onDone() : setStage('reasons'))} />;
  if (stage === 'reasons') return <Reasons shift={shift} onDone={(i) => { setReason(i); setStage('tour'); }} />;
  return <Tour shift={shift} height={height} insets={insets} onDone={() => onDone(reason)} />;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: COLORS.ink },
  tourRoot: { flex: 1, overflow: 'hidden' },
  mark: { position: 'absolute', left: s(117), top: s(324) },
  word: { position: 'absolute', left: 0, right: 0, top: s(452), textAlign: 'center', fontSize: s(34), fontFamily: FONTS.serifBold },
  hey: { position: 'absolute', left: 0, right: 0, top: s(123), textAlign: 'center', color: COLORS.blue, fontSize: s(40), fontFamily: FONTS.serifBoldItalic },
  why: { position: 'absolute', left: 0, right: 0, top: s(180), textAlign: 'center', fontSize: s(22), lineHeight: s(26) },
  reason: { position: 'absolute', left: s(43), width: s(307), height: s(68), borderWidth: 0.5, borderColor: COLORS.paper, borderRadius: s(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: s(14), paddingRight: s(16) },
  reasonText: { fontFamily: FONTS.sans, fontSize: s(20) },
  box: { width: s(22), height: s(22), borderWidth: 0.5, borderColor: COLORS.paper, borderRadius: s(11) },
  curious: { position: 'absolute', left: 0, right: 0, top: s(116), textAlign: 'center', color: COLORS.blue, fontSize: s(40), lineHeight: s(48), fontFamily: FONTS.serifBold },
  line: { position: 'absolute', left: s(30), right: s(30), top: s(225), textAlign: 'center', fontFamily: FONTS.sans, fontSize: s(22), lineHeight: s(26) },
  disc: { position: 'absolute', width: s(72), height: s(72), borderRadius: s(36), alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  discText: { fontSize: s(28) },
  cap: { position: 'absolute', left: s(20), right: s(20), textAlign: 'center', fontFamily: FONTS.sans, fontSize: s(9) },
  next: { position: 'absolute', left: s(105), width: s(180), height: s(69), borderRadius: s(42), borderWidth: 1, borderColor: COLORS.paper, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: FONTS.serifItalic, fontSize: s(32) },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: s(8) },
  dot: { width: s(7), height: s(7), borderRadius: s(4), borderWidth: 1, borderColor: COLORS.paper },
});
