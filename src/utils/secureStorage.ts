import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
};

export async function saveTokens(accessToken: string, refreshToken: string) {
  try {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
  } catch (e) {
    console.warn('[secureStorage] saveTokens 실패 (키체인 접근 불가) — 메모리 토큰으로 계속 진행:', e);
  }
}

export async function getTokens() {
  try {
    const accessToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
    const refreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    return { accessToken, refreshToken };
  } catch (e) {
    console.warn('[secureStorage] getTokens 실패:', e);
    return { accessToken: null, refreshToken: null };
  }
}

export async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  } catch (e) {
    console.warn('[secureStorage] clearTokens 실패:', e);
  }
}
