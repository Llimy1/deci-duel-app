/**
 * 네이티브 SDK 기반 OAuth 로그인 헬퍼 (Google / Kakao)
 *
 * - Apple은 expo-apple-authentication을 화면에서 직접 사용하므로 여기서 다루지 않는다.
 * - Google: @react-native-google-signin/google-signin → idToken 획득
 * - Kakao: @react-native-kakao/user → accessToken 획득
 *
 * 두 SDK 모두 최초 호출 전 설정/초기화가 필요해서 idempotent한 ensure 함수로 감싼다.
 */
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login as kakaoNativeLogin, isKakaoTalkLoginAvailable } from '@react-native-kakao/user';

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

// Google Cloud Console에서 발급받은 OAuth 클라이언트 ID (서버 GOOGLE_ALLOWED_CLIENT_IDS와 동일 세트).
// EXPO_PUBLIC_* 환경변수로 빌드 프로필별(dev/preview/prod) 교체 가능 — client.ts의 API_BASE_URL과 동일 패턴.
const GOOGLE_WEB_CLIENT_ID = envValue('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
const GOOGLE_IOS_CLIENT_ID = envValue('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');

// Kakao Developers에 등록된 네이티브 앱 키. app.config.ts 플러그인 설정의 nativeAppKey와 반드시 동일해야 한다.
const KAKAO_NATIVE_APP_KEY = envValue('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY');

let googleConfigured = false;
let kakaoSdkInitPromise: Promise<void> | null = null;

/** GoogleSignin.configure는 여러 번 호출해도 안전하지만, 불필요한 호출을 줄이기 위해 1회만 수행한다. */
export function ensureGoogleSignInConfigured(): void {
  if (googleConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID || !GOOGLE_IOS_CLIENT_ID) {
    throw new OAuthProviderError('Google 로그인 설정이 누락되었습니다.');
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

/** Kakao SDK 초기화는 비동기이며, 동시에 여러 번 호출되어도 한 번만 실행되도록 Promise를 캐시한다. */
export function ensureKakaoSdkInitialized(): Promise<void> {
  if (!KAKAO_NATIVE_APP_KEY) {
    return Promise.reject(new OAuthProviderError('Kakao 로그인 설정이 누락되었습니다.'));
  }
  if (!kakaoSdkInitPromise) {
    kakaoSdkInitPromise = initializeKakaoSDK(KAKAO_NATIVE_APP_KEY).catch((e) => {
      kakaoSdkInitPromise = null; // 실패 시 다음 시도에서 재초기화하도록 캐시 무효화
      throw e;
    });
  }
  return kakaoSdkInitPromise;
}

export class OAuthCancelledError extends Error {
  constructor(public provider: 'google' | 'kakao') {
    super(`${provider} 로그인이 취소되었습니다.`);
    this.name = 'OAuthCancelledError';
  }
}

export class OAuthProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'OAuthProviderError';
  }
}

export function isOAuthCancelledError(error: unknown): boolean {
  if (error instanceof OAuthCancelledError) return true;
  if (error == null || typeof error !== 'object') return false;

  const source = error as {
    code?: unknown;
    message?: unknown;
    msg?: unknown;
    name?: unknown;
    error?: unknown;
  };
  return [
    source.code,
    source.message,
    source.msg,
    source.name,
    source.error,
  ].some(isCancelMessage);
}

/**
 * Google 네이티브 로그인 → idToken 반환
 * 사용자가 취소한 경우 OAuthCancelledError를 던진다 (Toast 노출 안 함, 호출부에서 silent 처리).
 */
export async function signInWithGoogleNative(): Promise<string> {
  ensureGoogleSignInConfigured();
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      throw new OAuthCancelledError('google');
    }
    if (!isSuccessResponse(response)) {
      throw new OAuthProviderError('Google 로그인에 실패했습니다.');
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new OAuthProviderError('Google에서 idToken을 받지 못했습니다.');
    }
    return idToken;
  } catch (e) {
    if (e instanceof OAuthCancelledError || e instanceof OAuthProviderError) throw e;
    if (isOAuthCancelledError(e)) {
      throw new OAuthCancelledError('google');
    }
    if (isErrorWithCode(e)) {
      switch (e.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new OAuthCancelledError('google');
        case statusCodes.IN_PROGRESS:
          throw new OAuthProviderError('이미 Google 로그인이 진행 중입니다.', e);
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new OAuthProviderError('Google Play 서비스를 사용할 수 없습니다.', e);
        default:
          throw new OAuthProviderError('Google 로그인 중 오류가 발생했습니다.', e);
      }
    }
    throw e;
  }
}

function isCancelMessage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /cancel|canceled|cancelled|user_cancel|request_canceled|sign_in_cancelled/i.test(value);
}

async function loginWithKakaoAccount(): Promise<string> {
  try {
    const token = await kakaoNativeLogin({ useKakaoAccountLogin: true });
    if (!token?.accessToken) {
      throw new OAuthProviderError('카카오에서 accessToken을 받지 못했습니다.');
    }
    return token.accessToken;
  } catch (e) {
    if (e instanceof OAuthProviderError) throw e;
    if (isOAuthCancelledError(e)) {
      throw new OAuthCancelledError('kakao');
    }
    throw e;
  }
}

/**
 * Kakao 네이티브 로그인 → accessToken 반환
 * - 사용자가 로그인을 취소한 경우 OAuthCancelledError
 * - KakaoTalk을 사용할 수 없거나 일반 로그인 실패 시 카카오계정 로그인으로 폴백
 */
export async function signInWithKakaoNative(): Promise<string> {
  await ensureKakaoSdkInitialized();
  try {
    const talkAvailable = await isKakaoTalkLoginAvailable().catch(() => true);
    if (!talkAvailable) {
      return await loginWithKakaoAccount();
    }

    const token = await kakaoNativeLogin();
    if (!token?.accessToken) {
      throw new OAuthProviderError('카카오에서 accessToken을 받지 못했습니다.');
    }
    return token.accessToken;
  } catch (e: any) {
    if (e instanceof OAuthCancelledError || e instanceof OAuthProviderError) throw e;

    if (isOAuthCancelledError(e)) {
      throw new OAuthCancelledError('kakao');
    }

    try {
      return await loginWithKakaoAccount();
    } catch (fallbackError) {
      if (fallbackError instanceof OAuthCancelledError || fallbackError instanceof OAuthProviderError) {
        throw fallbackError;
      }
      throw new OAuthProviderError('카카오 로그인 중 오류가 발생했습니다.', fallbackError);
    }
  }
}
