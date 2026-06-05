/**
 * me.ts 에러 경로 단위 테스트
 *
 * 검증 항목:
 *  1. updateNickname() — 409 응답 → server message로 throw
 *  2. uploadProfileImageFromUri() — 400 응답 → server message로 throw
 *  3. fetchMe() — 404 응답 → throw
 */

// ── expo 모듈 mock ────────────────────────────────────────────────────────────
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  downloadAsync: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── store / utils mock ────────────────────────────────────────────────────────
jest.mock('../../store', () => ({
  useAppStore: {
    getState: () => ({
      accessToken: 'test-token',
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

import { fetchMe, updateNickname, uploadProfileImageFromUri } from '../me';

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

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('updateNickname()', () => {
  it('409 응답 → server message로 throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(409, '이미 사용 중인 닉네임입니다.'));
    await expect(updateNickname('duplicated')).rejects.toThrow('이미 사용 중인 닉네임입니다.');
  });

  it('성공 시 nickname 문자열 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ nickname: 'newNick' }));
    const result = await updateNickname('newNick');
    expect(result).toBe('newNick');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('uploadProfileImageFromUri()', () => {
  it('400 응답 → server message로 throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(400, '이미지 형식이 올바르지 않습니다.'));
    await expect(
      uploadProfileImageFromUri('file:///tmp/photo.jpg', 'photo.jpg', 'image/jpeg')
    ).rejects.toThrow('이미지 형식이 올바르지 않습니다.');
  });

  it('413 응답 → server message로 throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(413, '파일 크기가 너무 큽니다.'));
    await expect(
      uploadProfileImageFromUri('file:///tmp/large.jpg')
    ).rejects.toThrow('파일 크기가 너무 큽니다.');
  });

  it('성공 시 profileImageUrl 문자열 반환', async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ profileImageUrl: 'https://cdn.example.com/img.jpg' })
    );
    const url = await uploadProfileImageFromUri('file:///tmp/photo.jpg');
    expect(url).toBe('https://cdn.example.com/img.jpg');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('fetchMe()', () => {
  it('404 응답 → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, '사용자를 찾을 수 없습니다.'));
    await expect(fetchMe()).rejects.toThrow('사용자를 찾을 수 없습니다.');
  });

  it('성공 시 Me 객체 반환', async () => {
    const meData = {
      id: 1,
      nickname: 'tester',
      avatarColor: '#ff2d87',
      profileImageUrl: null,
      streak: 3,
      wins: 10,
      losses: 5,
      bestDb: 90,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    mockFetch.mockResolvedValueOnce(makeOkResponse(meData));
    const result = await fetchMe();
    expect(result).toEqual(meData);
  });
});
