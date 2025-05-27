// Responsive sizing utilities based on game constants pattern
// YAGNI: Simple but effective sizing system

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base sizes for different component types
const BASE_SIZES = {
  small: 40,
  medium: 60,
  large: 80,
  xlarge: 100,
};

// Screen size categories
const getScreenCategory = () => {
  if (SCREEN_WIDTH < 360) {return 'small';}
  if (SCREEN_WIDTH < 414) {return 'medium';}
  if (SCREEN_WIDTH < 768) {return 'large';}
  return 'xlarge';
};

// Scale factor based on screen size
const getScaleFactor = () => {
  const category = getScreenCategory();
  switch (category) {
    case 'small': return 0.85;
    case 'medium': return 1.0;
    case 'large': return 1.15;
    case 'xlarge': return 1.3;
    default: return 1.0;
  }
};

export const sizing = {
  // Get responsive size
  responsive: (baseSize: keyof typeof BASE_SIZES | number) => {
    const size = typeof baseSize === 'number' ? baseSize : BASE_SIZES[baseSize];
    return Math.round(size * getScaleFactor());
  },

  // Get percentage of screen
  screenWidth: (percentage: number) => SCREEN_WIDTH * (percentage / 100),
  screenHeight: (percentage: number) => SCREEN_HEIGHT * (percentage / 100),

  // Common sizes
  componentSize: {
    small: () => sizing.responsive('small'),
    medium: () => sizing.responsive('medium'),
    large: () => sizing.responsive('large'),
    xlarge: () => sizing.responsive('xlarge'),
  },

  // Touch targets (minimum 44px for accessibility)
  touchTarget: (size: number) => Math.max(44, size),

  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    category: getScreenCategory(),
  },
};
