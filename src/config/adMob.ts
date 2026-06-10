import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getProfileBannerAdUnitId() {
  if (isDev) return TestIds.ADAPTIVE_BANNER;

  return Platform.select({
    ios: clean(process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_PROFILE_UNIT_ID),
    android: clean(process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_PROFILE_UNIT_ID),
    default: null,
  });
}
