/**
 * oauth.ts 단위 테스트
 *
 * 검증 항목:
 *  1. oauthLogin() — 기존 유저 → AuthTokenData 반환
 *  2. oauthLogin() — 신규 유저 → signupToken 반환
 *  3. oauthLogin() — 401 토큰 오류 → throw
 *  4. completeOAuthSignup() — 성공 → AuthTokenData 반환
 *  5. completeOAuthSignup() — 409 닉네임 중복 → throw
 */

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../store', () => ({
  useAppStore: {
    getState: () => ({
      accessToken: null,
      refreshToken: null,
      logout: jest.fn(),
      setTokens: jest.fn(),
    }),
  },
}));

jest.mock('../../utils/secureStorage', () => ({
  getTokens: jest.fn().mockResolvedValue({ accessToken: null, refreshToken: null }),
  saveTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/toast', () => ({
  Toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() },
}));

import { oauthLogin, completeOAuthSignup } from '../oauth';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

function makeErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ message }),
  } as unknown as Response;
}

function makeOkResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ statusCode: 200, message: 'ok', data }),
  } as unknown as Response;
}

const mockTokenData = {
  isNewUser: false,
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: 1, nickname: '테스터' },
};

const mockNewUserData = {
  isNewUser: true,
  signupToken: 'signup-token-abc',
  provider: 'kakao',
};

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

describe('oauthLogin()', () => {
  it('기존 유저 — isNewUser=false + 토큰 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockTokenData));
    const result = await oauthLogin('kakao', { accessToken: 'kakao_token' });
    expect(result.isNewUser).toBe(false);
    if (!result.isNewUser) {
      expect(result).toHaveProperty('accessToken');
      expect(result.user.id).toBe(1);
    }
  });

  it('신규 유저 — isNewUser=true + signupToken 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockNewUserData));
    const result = await oauthLogin('kakao', { accessToken: 'new_kakao_token' });
    expect(result.isNewUser).toBe(true);
    if (result.isNewUser) {
      expect(result.signupToken).toBe('signup-token-abc');
      expect(result.provider).toBe('kakao');
    }
  });

  it('401 응답 (토큰 오류) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'OAuth 토큰 검증에 실패했습니다.'));
    await expect(oauthLogin('apple', { idToken: 'bad_token' })).rejects.toThrow(
      'OAuth 토큰 검증에 실패했습니다.',
    );
  });

  it('skipAuth=true — Authorization 헤더 없음', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockTokenData));
    await oauthLogin('kakao', { accessToken: 'token' });
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers?.['Authorization']).toBeUndefined();
  });
});

describe('completeOAuthSignup()', () => {
  it('성공 — isNewUser=true + 토큰 반환', async () => {
    const signupResult = { ...mockTokenData, isNewUser: true };
    mockFetch.mockResolvedValueOnce(makeOkResponse(signupResult));
    const result = await completeOAuthSignup('signup-token', '새닉네임', '1.0', '1.0');
    expect(result.isNewUser).toBe(true);
    expect(result).toHaveProperty('accessToken');
    expect(result.user.nickname).toBe('테스터');
  });

  it('409 응답 (닉네임 중복) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(409, '이미 사용 중인 닉네임입니다.'));
    await expect(
      completeOAuthSignup('signup-token', '중복닉', '1.0', '1.0'),
    ).rejects.toThrow('이미 사용 중인 닉네임입니다.');
  });

  it('401 응답 (signupToken 만료) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, '유효하지 않은 가입 토큰입니다.'));
    await expect(
      completeOAuthSignup('expired-token', '닉네임', '1.0', '1.0'),
    ).rejects.toThrow('유효하지 않은 가입 토큰입니다.');
  });
});
