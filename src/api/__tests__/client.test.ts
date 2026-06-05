/**
 * client.ts — apiGet / apiPost / apiPatch / apiDelete 에러 핸들링 단위 테스트
 *
 * 검증 항목:
 *  1. Non-ok 응답 + JSON { message } → error.message === server message
 *  2. Non-ok 응답 + JSON 파싱 불가   → error.message에 status code 포함
 *  3. fetch 자체 throw (네트워크 오류) → error.message에 네트워크 오류 텍스트 포함
 *  4. 401 + refreshToken 없음         → expireSession 호출 (logout)
 *  5. 401 + refreshToken 있음         → 토큰 갱신 후 원래 요청 재시도
 */

// ── mock: expo-secure-store ────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── mock: toast ────────────────────────────────────────────────────────────
jest.mock('../../utils/toast', () => ({
  Toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() },
}));

// ── mock: store ────────────────────────────────────────────────────────────
// Use a single mutable object so getState() always returns current values.
// setTokens mutates mockStoreState.accessToken so the recursive retry call
// in client.ts picks up the new token from useAppStore.getState().accessToken.
const mockStoreState = {
  accessToken: 'test-access-token' as string | null,
  refreshToken: null as string | null,
  logout: jest.fn(),
  setTokens: jest.fn((at: string, rt: string, _id: number) => {
    mockStoreState.accessToken = at;
    mockStoreState.refreshToken = rt;
  }),
};

jest.mock('../../store', () => ({
  useAppStore: {
    getState: () => mockStoreState,
  },
}));

// ── mock: secureStorage ────────────────────────────────────────────────────
jest.mock('../../utils/secureStorage', () => ({
  getTokens: jest.fn().mockResolvedValue({ accessToken: null, refreshToken: null }),
  saveTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

import { apiGet, apiPost, apiPatch, apiDelete } from '../client';
import { getTokens } from '../../utils/secureStorage';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockGetTokens = getTokens as jest.MockedFunction<typeof getTokens>;

// ── response helpers ───────────────────────────────────────────────────────

function makeOkResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ statusCode: 200, message: 'ok', data }),
  } as unknown as Response;
}

function makeErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({ message }),
  } as unknown as Response;
}

function makeErrorResponseNoJson(status: number) {
  return {
    ok: false,
    status,
    json: jest.fn().mockRejectedValue(new Error('not json')),
  } as unknown as Response;
}

// ── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  mockStoreState.logout.mockReset();
  mockStoreState.setTokens.mockReset();
  mockStoreState.accessToken = 'test-access-token';
  mockStoreState.refreshToken = null;
  // restore setTokens mutation side-effect after mockReset
  mockStoreState.setTokens.mockImplementation((at: string, rt: string, _id: number) => {
    mockStoreState.accessToken = at;
    mockStoreState.refreshToken = rt;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Non-ok + JSON message
// ─────────────────────────────────────────────────────────────────────────────

describe('Non-ok 응답 처리', () => {
  it('JSON { message } 포함 → error.message === server message (apiGet)', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(400, '잘못된 요청입니다.'));
    await expect(apiGet('/test')).rejects.toThrow('잘못된 요청입니다.');
  });

  it('JSON { message } 포함 → error.message === server message (apiPost)', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(422, '유효성 검사 실패'));
    await expect(apiPost('/test', { foo: 'bar' })).rejects.toThrow('유효성 검사 실패');
  });

  it('JSON { message } 포함 → error.message === server message (apiPatch)', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(403, '권한이 없습니다.'));
    await expect(apiPatch('/test', {})).rejects.toThrow('권한이 없습니다.');
  });

  it('JSON { message } 포함 → error.message === server message (apiDelete)', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, '리소스를 찾을 수 없습니다.'));
    await expect(apiDelete('/test')).rejects.toThrow('리소스를 찾을 수 없습니다.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Non-ok + JSON 파싱 불가
// ─────────────────────────────────────────────────────────────────────────────

describe('Non-ok 응답 — JSON 없음', () => {
  it('JSON 파싱 실패 시 error.message에 status code가 포함된다', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponseNoJson(503));
    await expect(apiGet('/test')).rejects.toThrow('503');
  });

  it('500 응답 JSON 없음 → status 500 포함', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponseNoJson(500));
    await expect(apiPost('/test', {})).rejects.toThrow('500');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 네트워크 오류 (fetch throw)
// ─────────────────────────────────────────────────────────────────────────────

describe('네트워크 오류', () => {
  it('fetch가 throw하면 네트워크 오류 메시지가 포함된 에러를 던진다', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to connect'));
    await expect(apiGet('/test')).rejects.toThrow('네트워크 연결을 확인해주세요.');
  });

  it('원래 오류 메시지도 포함된다', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(apiPost('/endpoint', {})).rejects.toThrow('ECONNREFUSED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 401 + refreshToken 없음 → expireSession (logout)
// ─────────────────────────────────────────────────────────────────────────────

describe('401 응답 — refreshToken 없음', () => {
  beforeEach(() => {
    mockStoreState.refreshToken = null;
    mockGetTokens.mockResolvedValue({ accessToken: null, refreshToken: null });
  });

  it('logout이 호출된다', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, '인증이 만료되었습니다.'));
    await expect(apiGet('/protected')).rejects.toThrow();
    expect(mockStoreState.logout).toHaveBeenCalledTimes(1);
  });

  it('skipAuth=true인 요청은 401 처리를 하지 않는다', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, '잘못된 자격증명'));
    await expect(apiGet('/login', { skipAuth: true })).rejects.toThrow('잘못된 자격증명');
    expect(mockStoreState.logout).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. 401 + refreshToken 있음 → 토큰 갱신 후 재시도
// ─────────────────────────────────────────────────────────────────────────────

describe('401 응답 — refreshToken 있음', () => {
  beforeEach(() => {
    mockStoreState.refreshToken = 'valid-refresh-token';
    mockGetTokens.mockResolvedValue({ accessToken: null, refreshToken: 'valid-refresh-token' });
  });

  it('refresh 엔드포인트를 호출하고, 새 accessToken으로 원래 요청을 재시도한다', async () => {
    // 첫 호출: 401
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'));
    // 두 번째 호출: /auth/refresh 성공 → setTokens 호출로 mockStoreState.accessToken 업데이트
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        statusCode: 200,
        message: 'ok',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: { id: 1, nickname: 'tester' },
        },
      }),
    } as unknown as Response);
    // 세 번째 호출: 재시도 성공
    mockFetch.mockResolvedValueOnce(makeOkResponse({ id: 1 }));

    const result = await apiGet('/protected');
    expect(result.data).toEqual({ id: 1 });

    // fetch가 총 3번 호출됨 (원래 요청 + refresh + 재시도)
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // setTokens가 새 토큰으로 호출됨
    expect(mockStoreState.setTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token', 1);

    // 세 번째(재시도) 호출의 Authorization 헤더에 새 토큰이 포함됨
    // client.ts retry: init.headers에 새 토큰 설정 후 store token으로 덮어써지므로
    // mockStoreState.accessToken이 'new-access-token'으로 업데이트된 상태임
    const thirdCallHeaders = (mockFetch.mock.calls[2][1] as RequestInit).headers as Record<string, string>;
    expect(thirdCallHeaders['Authorization']).toBe('Bearer new-access-token');
  });

  it('refresh 자체가 실패하면 logout이 호출된다', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'));
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'refresh token invalid'));

    await expect(apiGet('/protected')).rejects.toThrow();
    expect(mockStoreState.logout).toHaveBeenCalledTimes(1);
  });
});
