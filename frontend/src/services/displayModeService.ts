import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisplayLayoutMode = 'auto' | 'mobile' | 'web';

const STORAGE_KEY = '@recalpt_display_layout_mode';

export async function loadDisplayLayoutMode(): Promise<DisplayLayoutMode> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value === 'auto' || value === 'mobile' || value === 'web') {
      return value;
    }
  } catch (e) {
    console.warn('[DisplayMode] load failed', e);
  }
  return 'auto';
}

export async function saveDisplayLayoutMode(mode: DisplayLayoutMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}
