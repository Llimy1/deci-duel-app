/**
 * diary.ts 에러 경로 단위 테스트
 *
 * 검증 항목:
 *  1. createDiary() — 400 (invalid date) → throw
 *  2. getDiaryByDate() — 404 → throw
 *  3. updateDiary() — 404 → throw
 *  4. deleteDiary() — 404 → throw
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

import { createDiary, getDiaryByDate, updateDiary, deleteDiary } from '../diary';

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

describe('createDiary()', () => {
  it('400 응답 (날짜 형식 오류) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(400, '날짜 형식이 올바르지 않습니다.'));
    await expect(
      createDiary({ peakDb: 80, emoji: '😊', date: 'not-a-date', comment: '' })
    ).rejects.toThrow('날짜 형식이 올바르지 않습니다.');
  });

  it('409 응답 (이미 존재) → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(409, '해당 날짜에 이미 일기가 존재합니다.'));
    await expect(
      createDiary({ peakDb: 80, emoji: '😊', date: '2025-01-01', comment: '' })
    ).rejects.toThrow('해당 날짜에 이미 일기가 존재합니다.');
  });

  it('성공 시 응답 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true }));
    const result = await createDiary({ peakDb: 80, emoji: '😊', date: '2025-01-01', comment: '좋았다' });
    expect(result.data.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getDiaryByDate()', () => {
  it('404 응답 → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, '해당 날짜의 일기를 찾을 수 없습니다.'));
    await expect(getDiaryByDate('2025-01-01')).rejects.toThrow('해당 날짜의 일기를 찾을 수 없습니다.');
  });

  it('성공 시 일기 엔트리 반환', async () => {
    const entry = { date: '2025-01-01', peakDb: 85, emoji: '🔥', comment: '최고!' };
    mockFetch.mockResolvedValueOnce(makeOkResponse(entry));
    const result = await getDiaryByDate('2025-01-01');
    expect(result.data).toEqual(entry);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('updateDiary()', () => {
  it('404 응답 → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, '수정할 일기를 찾을 수 없습니다.'));
    await expect(
      updateDiary('2025-01-01', { emoji: '😴', comment: '수정됨' })
    ).rejects.toThrow('수정할 일기를 찾을 수 없습니다.');
  });

  it('성공 시 응답 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true }));
    const result = await updateDiary('2025-01-01', { emoji: '😴', comment: '수정됨' });
    expect(result.data.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('deleteDiary()', () => {
  it('404 응답 → throw', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, '삭제할 일기를 찾을 수 없습니다.'));
    await expect(deleteDiary('2025-01-01')).rejects.toThrow('삭제할 일기를 찾을 수 없습니다.');
  });

  it('성공 시 응답 반환', async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true }));
    const result = await deleteDiary('2025-01-01');
    expect(result.data.success).toBe(true);
  });
});
