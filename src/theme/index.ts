export const C = {
  bg: '#0a0612',
  bgDeep: '#0c0518',
  bgElev: '#13091f',
  surface: '#1c0e2e',
  surface2: '#261444',
  surfaceDeep: '#12091d',
  surfaceElevated: '#211038',
  line: '#3a1d5c',
  text: '#ffffff',
  textDim: '#b39bd1',
  textMute: '#6a4d8e',
  pink: '#ff2d87',
  cyan: '#00e5ff',
  yellow: '#ffd400',
  lime: '#a3ff12',
  purple: '#9d4edd',
  win: '#a3ff12',
  lose: '#ff2d87',
};

export const gradHot = ['#ff2d87', '#9d4edd', '#00e5ff'] as const;
export const gradCool = ['#00e5ff', '#9d4edd'] as const;
export const gradFire = ['#ffd400', '#ff2d87', '#9d4edd'] as const;

export const FS = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 22,
  '2xl': 28, '3xl': 36, '4xl': 56, '5xl': 80, hero: 120,
};

export const FW = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '800' as const,
};

export const S = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
};

export const R = {
  sm: 8, md: 12, lg: 16, xl: 22, '2xl': 28, pill: 999,
};

export const FONTS = {
  display: 'BowlbyOne_400Regular',
  headBold: 'SpaceGrotesk_700Bold',
  headSemibold: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
};
