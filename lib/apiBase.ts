import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Relative fetch('/api/…') works on both web and native in dev — Expo points it
// at the dev server. But <Image source={{ uri }}> has no such help: on a phone a
// relative path resolves against nothing and the tile silently stays blank.
// So image URLs specifically need an absolute base.
//
// When this app is deployed (project 2), this is where the expo-router `origin`
// value gets read from instead of the dev host.
export function apiBase(): string {
  if (Platform.OS === 'web') return '';

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return '';
  return `http://${hostUri}`;
}

export function imageUrlFor(garmentId: string, imageFilename: string | null): string | null {
  if (!imageFilename) return null;
  return `${apiBase()}/api/images/${garmentId}`;
}

// Same route, `?variant=cutout` selects the transparent PNG. Null when the
// garment has no cutout, so callers fall back to imageUrl.
export function cutoutUrlFor(garmentId: string, cutoutFilename: string | null): string | null {
  if (!cutoutFilename) return null;
  return `${apiBase()}/api/images/${garmentId}?variant=cutout`;
}
