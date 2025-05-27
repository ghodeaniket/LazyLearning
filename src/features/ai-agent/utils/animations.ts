// Reusable animation patterns extracted from game components
// Following DRY principle

import { withSpring, withTiming, Easing } from 'react-native-reanimated';

export const springConfig = {
  default: {
    damping: 15,
    stiffness: 100,
  },
  bouncy: {
    damping: 12,
    stiffness: 150,
  },
  smooth: {
    damping: 20,
    stiffness: 80,
  },
};

export const animations = {
  // Entrance animation
  fadeIn: (duration = 300) => ({
    opacity: withTiming(1, { duration }),
  }),

  // Scale animations
  scaleIn: (scale = 1, config = springConfig.default) => ({
    scale: withSpring(scale, config),
  }),

  // Pulse animation for high priority items
  pulse: (minScale = 1, maxScale = 1.1, duration = 500) => {
    const animate = () => ({
      scale: withTiming(maxScale, { duration }, () =>
        withTiming(minScale, { duration }, animate)
      ),
    });
    return animate();
  },

  // Movement animations
  smoothMove: (x: number, y: number, config = springConfig.default) => ({
    translateX: withSpring(x, config),
    translateY: withSpring(y, config),
  }),

  // Rotation animations
  wobble: (amplitude = 5, duration = 1000) => ({
    rotate: withTiming(
      amplitude,
      { duration, easing: Easing.inOut(Easing.ease) },
      () => withTiming(-amplitude, {
        duration,
        easing: Easing.inOut(Easing.ease),
      })
    ),
  }),
};
