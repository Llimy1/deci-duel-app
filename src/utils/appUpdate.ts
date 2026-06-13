import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SKIPPED_UPDATE_VERSION_KEY } from '../constants/storageKeys';

// App Store Connect 앱 식별자 (eas.json submit.production.ios.ascAppId와 동일)
const APP_STORE_ID = '6778819304';
const APP_STORE_COUNTRY = 'kr';
const BUNDLE_ID = 'com.deciduel.app';
const FALLBACK_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

export interface AppUpdateInfo {
  version: string;
  storeUrl: string;
}

// "1.2.3" 형태의 버전 문자열을 숫자 배열로 비교 (a > b면 양수)
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n) || 0);
  const pb = b.split('.').map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface ItunesLookupResult {
  version?: string;
  trackViewUrl?: string;
}

// 스토어에 더 새로운 버전이 있고, 사용자가 해당 버전을 건너뛰지 않았다면 업데이트 정보를 반환
export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  if (Platform.OS !== 'ios') return null;

  const currentVersion = Constants.expoConfig?.version;
  if (!currentVersion) return null;

  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=${APP_STORE_COUNTRY}`,
    );
    if (!res.ok) return null;

    const data: { results?: ItunesLookupResult[] } = await res.json();
    const result = data.results?.[0];
    if (!result?.version) return null;

    if (compareVersions(result.version, currentVersion) <= 0) return null;

    const skippedVersion = await AsyncStorage.getItem(SKIPPED_UPDATE_VERSION_KEY);
    if (skippedVersion === result.version) return null;

    return {
      version: result.version,
      storeUrl: result.trackViewUrl || FALLBACK_STORE_URL,
    };
  } catch {
    return null;
  }
}

export async function skipAppUpdateVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIPPED_UPDATE_VERSION_KEY, version);
  } catch {}
}
