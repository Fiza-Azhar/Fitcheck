import { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#F7F1E8', surface: '#FFFDF9', text: '#2E2A26', muted: '#8A8178',
  accent: '#C56B4A', accentSoft: '#EAD3C6',
  success: '#4F8A5B', successBg: '#E6F1E8', warn: '#C98A2E', warnBg: '#F7ECD8',
  chip: '#EFE7DA', border: '#E7DDCD',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 10, md: 16, lg: 20, pill: 999 } as const;

export const shadow: ViewStyle = {
  shadowColor: '#3A2E22', shadowOpacity: 0.08, shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 }, elevation: 3,
};

export const type = {
  title: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.4 } as TextStyle,
  h2: { fontSize: 18, fontWeight: '700', color: colors.text } as TextStyle,
  body: { fontSize: 15, fontWeight: '500', color: colors.text } as TextStyle,
  label: { fontSize: 13, fontWeight: '600', color: colors.muted } as TextStyle,
  chip: { fontSize: 12, fontWeight: '600', color: colors.text } as TextStyle,
};
