import { Platform } from 'react-native';
import { useFonts as usePoppins, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useFonts as useRoboto, Roboto_400Regular, Roboto_500Medium } from '@expo-google-fonts/roboto';

export type ColorKey = 'primary' | 'accent' | 'error' | 'success' | 'warning' | 'bg' | 'surface' | 'border' | 'text' | 'textSecondary' | 'link';

const colors: Record<ColorKey, string> = {
  primary: '#2979FF',
  accent: '#00E5FF',
  error: '#FF4C4C',
  success: '#22C55E',
  warning: '#F59E0B',
  bg: '#121212',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  link: '#00E5FF',
};

const spacingScale = [0, 4, 8, 12, 16, 20, 24, 32, 40] as const;
export type SpacingIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const spacing = (n: SpacingIndex) => spacingScale[n];

const radius = { xs: 8, sm: 12, md: 16, lg: 24 } as const;
export type RadiusKey = keyof typeof radius;
export const getRadius = (k: RadiusKey) => radius[k];

const states = {
  focusRing: '#00E5FF',
  pressedAlpha: 0.12,
  hoverAlpha: 0.08,
  disabledAlpha: 0.4,
} as const;

const elevationTokens = {
  sm: { shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  lg: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;
export type ElevationKey = keyof typeof elevationTokens;
export const elevation = (k: ElevationKey) => {
  const e = elevationTokens[k];
  if (Platform.OS === 'android') return { elevation: e.elevation, backgroundColor: colors.surface };
  return {
    shadowColor: e.shadowColor,
    shadowOpacity: e.shadowOpacity,
    shadowRadius: e.shadowRadius,
    shadowOffset: e.shadowOffset,
    backgroundColor: colors.surface,
  };
};

export type TypographyKey = 'title' | 'subtitle' | 'body' | 'button' | 'caption';
const typography: Record<TypographyKey, { fontFamily: string; lineHeight: number; fontSize: number; color: string } > = {
  title: { fontFamily: 'Poppins_700Bold', lineHeight: 28, fontSize: 22, color: colors.text },
  subtitle: { fontFamily: 'Poppins_600SemiBold', lineHeight: 24, fontSize: 18, color: colors.text },
  body: { fontFamily: 'Roboto_400Regular', lineHeight: 22, fontSize: 16, color: colors.text },
  button: { fontFamily: 'Poppins_600SemiBold', lineHeight: 18, fontSize: 16, color: colors.text },
  caption: { fontFamily: 'Roboto_400Regular', lineHeight: 16, fontSize: 12, color: colors.textSecondary },
};

export function useLoadThemeFonts(): boolean {
  const [pLoaded] = usePoppins({ Poppins_600SemiBold, Poppins_700Bold });
  const [rLoaded] = useRoboto({ Roboto_400Regular, Roboto_500Medium });
  return Boolean(pLoaded && rLoaded);
}

export const theme = {
  mode: 'dark' as const,
  colors,
  spacing,
  radius,
  getRadius,
  elevation,
  states,
  typography,
};

export default theme;
