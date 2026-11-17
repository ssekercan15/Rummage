import { Easing, Platform } from 'react-native';

// Rummage's motion: smooth, sweeping moves. Things glide in fast and settle gently
// (ease-out), carry the speed of your finger when you let go, and never bounce.
export const NATIVE = Platform.OS !== 'web';
export const SWEEP_IN = { duration: 360, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: NATIVE }; // expo-out
export const SWEEP_OUT = { duration: 280, easing: Easing.bezier(0.33, 0, 0.15, 1), useNativeDriver: NATIVE };

// Spring that picks up the finger's speed and glides to rest without overshoot.
export const glide = (velocity = 0) => ({
  velocity,
  stiffness: 170,
  damping: 26,
  mass: 1,
  overshootClamping: true,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
  useNativeDriver: NATIVE,
});
