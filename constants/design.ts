import { TextStyle, ViewStyle } from 'react-native';

// One palette for the whole app: ivory ground, near-black ink, gold accent, with
// off-white and beige between them. The navy and periwinkle that used to sit here
// are gone — nothing derives from them any more.
export const colors = {
  bg: '#F7F1E8', surface: '#FAF9F6', text: '#1A1A1A', muted: '#6B6455',
  // Gold is a fill colour: it reads 1.9:1 on the ivory ground, far too weak for
  // text or a 1px line. Anything *drawn* in the accent — links, focus rings,
  // spinners, active icons — uses accentDeep, the same gold darkened to 5.3:1.
  accent: '#D4AF37', accentDeep: '#7A6019', accentSoft: '#F0E6C4',
  onFill: '#FAF9F6',
  success: '#4F8A5B', successBg: '#E6F1E8', warn: '#C98A2E', warnBg: '#F7ECD8',
  danger: '#C0453C',
  chip: '#F5F5DC', border: '#DDD9CB',
  // Ink at low alpha: modal scrim and the hairlines that separate a tile or
  // swatch from whatever sits behind it.
  scrim: 'rgba(26,26,26,0.45)', hairline: 'rgba(26,26,26,0.10)',
} as const;

// The button scale. Every fill ships with the label colour that belongs on it,
// so a caller can't pair them wrongly. These name the palette entries rather than
// repeating their hexes — a button fill and the surface it matches must never
// drift apart.
export const button = {
  primaryBg: colors.text, primaryTxt: colors.onFill,
  secondaryBg: colors.surface, secondaryTxt: colors.text,
  tertiaryBg: colors.accent, tertiaryTxt: colors.text,
  neutralBg: colors.chip, neutralTxt: colors.text,
  outline: colors.border,
  dangerBg: colors.danger, dangerTxt: colors.onFill,
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 10, md: 16, lg: 20, pill: 999 } as const;

export const shadow: ViewStyle = {
  shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 }, elevation: 3,
};

export const type = {
  title: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.4 } as TextStyle,
  h2: { fontSize: 18, fontWeight: '700', color: colors.text } as TextStyle,
  body: { fontSize: 15, fontWeight: '500', color: colors.text } as TextStyle,
  label: { fontSize: 13, fontWeight: '600', color: colors.muted } as TextStyle,
  chip: { fontSize: 12, fontWeight: '600', color: colors.text } as TextStyle,
};
