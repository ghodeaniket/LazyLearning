export const colors = {
  primary: {
    main: '#FF6B6B',
    light: '#FF8787',
    dark: '#E85D5D',
    contrast: '#FFFFFF',
  },
  secondary: {
    main: '#4ECDC4',
    light: '#6EDAD3',
    dark: '#3EB5AD',
    contrast: '#FFFFFF',
  },
  success: {
    main: '#51CF66',
    light: '#69D77C',
    dark: '#44B556',
  },
  warning: {
    main: '#FFD93D',
    light: '#FFE066',
    dark: '#E6C235',
  },
  error: {
    main: '#FF6B6B',
    light: '#FF8787',
    dark: '#E85D5D',
  },
  background: {
    default: '#F8F9FA',
    paper: '#FFFFFF',
    dark: '#1A1A2E',
  },
  text: {
    primary: '#212529',
    secondary: '#6C757D',
    disabled: '#ADB5BD',
    inverse: '#FFFFFF',
  },
  border: {
    light: '#E9ECEF',
    main: '#DEE2E6',
    dark: '#CED4DA',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;
