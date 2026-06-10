/**
 * 네이티브 OAuth 헬퍼(oauthProviders) 단위 테스트
 *
 * Codex [2026-06-07 14:14] 지시 — 검증해야 할 케이스:
 *  - Google idToken 없음 → 에러 (OAuthProviderError)
 *  - Google 사용자 취소 → OAuthCancelledError (Toast 노출 안 함은 LoginScreen에서 처리)
 *  - Kakao accessToken 없음 → 에러 (OAuthProviderError)
 *  - Kakao 사용자 취소 → OAuthCancelledError
 *
 * 네이티브 SDK(@react-native-google-signin/google-signin, @react-native-kakao/*)는
 * 모두 jest.mock으로 대체한다 (실제 네이티브 모듈은 Jest 환경에서 로드 불가).
 */

process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-google-web-client.apps.googleusercontent.com';
process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-google-ios-client.apps.googleusercontent.com';
process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY = 'test-kakao-native-app-key';

const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn();
const mockConfigure = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => {
  const actualStatusCodes = {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  };
  return {
    GoogleSignin: {
      configure: mockConfigure,
      hasPlayServices: mockHasPlayServices,
      signIn: mockSignIn,
    },
    statusCodes: actualStatusCodes,
    isCancelledResponse: (res: any) => res?.type === 'cancelled',
    isSuccessResponse: (res: any) => res?.type === 'success',
    isErrorWithCode: (err: any): err is { code: string } =>
      err != null && typeof err === 'object' && 'code' in err,
  };
});

const mockInitializeKakaoSDK = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-kakao/core', () => ({
  initializeKakaoSDK: (...args: any[]) => mockInitializeKakaoSDK(...args),
}));

const mockKakaoLogin = jest.fn();
const mockIsKakaoTalkLoginAvailable = jest.fn().mockResolvedValue(true);
jest.mock('@react-native-kakao/user', () => ({
  login: (...args: any[]) => mockKakaoLogin(...args),
  isKakaoTalkLoginAvailable: (...args: any[]) => mockIsKakaoTalkLoginAvailable(...args),
}));

// react-native은 jest.config.js의 moduleNameMapper가 이미 src/__mocks__/react-native.ts로
// 매핑하며, 그 안에 Platform.OS = 'ios'가 정의되어 있으므로 별도 mock이 필요 없다.

import {
  signInWithGoogleNative,
  signInWithKakaoNative,
  OAuthCancelledError,
  OAuthProviderError,
  isOAuthCancelledError,
} from '../oauthProviders';

beforeEach(() => {
  jest.clearAllMocks();
  mockHasPlayServices.mockResolvedValue(true);
  mockInitializeKakaoSDK.mockResolvedValue(undefined);
  mockIsKakaoTalkLoginAvailable.mockResolvedValue(true);
});

describe('signInWithGoogleNative', () => {
  it('idToken을 정상적으로 받으면 idToken을 반환한다', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-id-token' } });

    const idToken = await signInWithGoogleNative();

    expect(idToken).toBe('google-id-token');
    expect(mockConfigure).toHaveBeenCalled();
  });

  it('idToken이 없으면 OAuthProviderError를 던진다 (서버 호출로 이어지면 안 됨)', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: null } });

    await expect(signInWithGoogleNative()).rejects.toBeInstanceOf(OAuthProviderError);
  });

  it('사용자가 취소하면 OAuthCancelledError를 던진다 (Toast 노출 금지 신호)', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled', data: null });

    await expect(signInWithGoogleNative()).rejects.toBeInstanceOf(OAuthCancelledError);
  });

  it('SIGN_IN_CANCELLED 코드의 네이티브 에러도 OAuthCancelledError로 변환한다', async () => {
    mockSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });

    await expect(signInWithGoogleNative()).rejects.toBeInstanceOf(OAuthCancelledError);
  });

  it('PLAY_SERVICES_NOT_AVAILABLE 코드는 사용자 친화 메시지의 OAuthProviderError로 변환한다', async () => {
    mockSignIn.mockRejectedValue({ code: 'PLAY_SERVICES_NOT_AVAILABLE' });

    await expect(signInWithGoogleNative()).rejects.toMatchObject({
      constructor: OAuthProviderError,
      message: expect.stringContaining('Google Play'),
    });
  });
});

describe('isOAuthCancelledError', () => {
  it('Apple/Google SDK 취소 코드와 메시지를 취소로 판별한다', () => {
    expect(isOAuthCancelledError({ code: 'ERR_REQUEST_CANCELED' })).toBe(true);
    expect(isOAuthCancelledError({ code: 'SIGN_IN_CANCELLED' })).toBe(true);
    expect(isOAuthCancelledError({ message: 'The user cancelled the request.' })).toBe(true);
    expect(isOAuthCancelledError(new Error('network failed'))).toBe(false);
  });
});

describe('signInWithKakaoNative', () => {
  it('accessToken을 정상적으로 받으면 accessToken을 반환한다', async () => {
    mockKakaoLogin.mockResolvedValue({ accessToken: 'kakao-access-token' });

    const accessToken = await signInWithKakaoNative();

    expect(accessToken).toBe('kakao-access-token');
    expect(mockInitializeKakaoSDK).toHaveBeenCalledWith('test-kakao-native-app-key');
  });

  it('accessToken이 없으면 OAuthProviderError를 던진다 (서버 호출로 이어지면 안 됨)', async () => {
    mockKakaoLogin.mockResolvedValue({ accessToken: undefined });

    await expect(signInWithKakaoNative()).rejects.toBeInstanceOf(OAuthProviderError);
  });

  it('사용자가 취소하면 OAuthCancelledError를 던진다 (Toast 노출 금지 신호)', async () => {
    mockKakaoLogin.mockRejectedValue({ code: 'CANCELED', message: 'user cancelled the login' });

    await expect(signInWithKakaoNative()).rejects.toBeInstanceOf(OAuthCancelledError);
  });

  it('카카오톡을 사용할 수 없으면 카카오계정 로그인으로 폴백한다', async () => {
    mockIsKakaoTalkLoginAvailable.mockResolvedValue(false);
    mockKakaoLogin.mockResolvedValue({ accessToken: 'account-access-token' });

    await expect(signInWithKakaoNative()).resolves.toBe('account-access-token');
    expect(mockKakaoLogin).toHaveBeenCalledWith({ useKakaoAccountLogin: true });
  });

  it('카카오톡 로그인에서 알 수 없는 SDK 오류가 나면 카카오계정 로그인으로 폴백한다', async () => {
    mockKakaoLogin
      .mockRejectedValueOnce({ code: 'Package-Unknown', message: 'unknown' })
      .mockResolvedValueOnce({ accessToken: 'fallback-access-token' });

    await expect(signInWithKakaoNative()).resolves.toBe('fallback-access-token');
    expect(mockKakaoLogin).toHaveBeenNthCalledWith(1);
    expect(mockKakaoLogin).toHaveBeenNthCalledWith(2, { useKakaoAccountLogin: true });
  });

  it('카카오계정 fallback 창을 사용자가 취소하면 OAuthCancelledError를 던진다', async () => {
    mockKakaoLogin
      .mockRejectedValueOnce({ code: 'Package-Unknown', message: 'unknown' })
      .mockRejectedValueOnce({ code: 'CANCELED', message: 'user cancelled account login' });

    await expect(signInWithKakaoNative()).rejects.toBeInstanceOf(OAuthCancelledError);
  });

  it('카카오계정 fallback도 실패하면 일반 안내 메시지의 OAuthProviderError로 변환한다', async () => {
    mockKakaoLogin
      .mockRejectedValueOnce({ code: 'Package-Unknown', message: 'unknown' })
      .mockRejectedValueOnce({ code: 'AccountError', message: 'account failed' });

    await expect(signInWithKakaoNative()).rejects.toMatchObject({
      constructor: OAuthProviderError,
      message: '카카오 로그인 중 오류가 발생했습니다.',
    });
  });
});
