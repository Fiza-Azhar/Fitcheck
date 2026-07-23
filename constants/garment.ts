// Single source of truth for the garment vocabulary. The AI validator, the
// database layer and the edit form all check against these — a value that
// isn't here cannot enter the wardrobe.
export const CATEGORIES = ['top', 'bottom', 'footwear'] as const;
export const OCCASIONS = ['office', 'casual', 'wedding', 'winter'] as const;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export const FORMALITY_MIN = 1;
export const FORMALITY_MAX = 5;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
