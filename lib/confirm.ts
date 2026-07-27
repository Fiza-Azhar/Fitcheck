import { Alert, Platform } from 'react-native';

// react-native-web does not implement Alert: `Alert.alert` with buttons renders
// nothing and no button's onPress ever fires, so every "confirm, then act" and
// every error notice silently dies on web (a dead-looking Sign out / Remove
// button). These helpers route web to the browser's own dialogs and keep the
// real native Alert on device.

export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'OK',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
