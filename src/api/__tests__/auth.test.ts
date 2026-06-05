/**
 * auth.ts 에러 경로 단위 테스트
 *
 * 검증 항목:
 *  1. devLogin() — 404 (사용자 없음) → throw
 *  2. devLogin() — 401 (비밀번호 오류) → throw
 *  3. devSignup() — 409 (중복 ID) → throw
 */

// ── expo / store / utils mock ─────────────────────────────────────────────────
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

import { devLogin, devSignup } from '../auth';

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

const mockAuthData = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: 1, nickname: 'tester' },
};

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('devLogin()', () => {
  it('404 응답 (사용자 없음) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, '존재하지 않는 사용자입니다.'));
    await expect(devLogin('ghost', 'pw123')).rejects.toThrow('존재하지 않는 사용자입니다.');
  });

  it('401 응답 (비밀번호 오류) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, '비밀번호가 올바르지 않습니다.'));
    await expect(devLogin('user1', 'wrong')).rejects.toThrow('비밀번호가 올바르지 않습니다.');
  });

  it('성공 시 AuthTokenData 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthData));
    const result = await devLogin('user1', 'correct');
    expect(result).toEqual(mockAuthData);
  });

  it('skipAuth=true 옵션으로 호출되므로 Authorization 헤더를 포함하지 않는다', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthData));
    await devLogin('user1', 'correct');
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers?.['Authorization']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('devSignup()', () => {
  it('409 응답 (중복 ID) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(409, '이미 사용 중인 아이디입니다.'));
    await expect(
      devSignup('dup-user', 'pw123', 'nickname', '1.0.0', '1.0.0')
    ).rejects.toThrow('이미 사용 중인 아이디입니다.');
  });

  it('400 응답 (유효성 오류) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(400, '아이디는 최소 4자 이상이어야 합니다.'));
    await expect(
      devSignup('ab', 'pw', 'nick', '1.0.0', '1.0.0')
    ).rejects.toThrow('아이디는 최소 4자 이상이어야 합니다.');
  });

  it('성공 시 AuthTokenData 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthData));
    const result = await devSignup('newuser', 'securepass', 'nickname', '1.0.0', '1.0.0');
    expect(result).toEqual(mockAuthData);
  });

  it('skipAuth=true 옵션으로 호출된다 (Authorization 헤더 없음)', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(mockAuthData));
    await devSignup('newuser', 'securepass', 'nickname', '1.0.0', '1.0.0');
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers?.['Authorization']).toBeUndefined();
  });
});
