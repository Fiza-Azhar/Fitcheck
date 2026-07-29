// Metro resolves require() for images at bundle time, so the paths must be
// string literals. Keeping them here means screens import a name instead of
// repeating a relative path that breaks whenever a component moves.
export const images = {
  logo: require('../assets/images/logo.png'),
  camera: require('../assets/images/camera.png'),
  gallery: require('../assets/images/gallery.png'),
} as const;
