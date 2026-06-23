jest.mock('../../api/me', () => ({
  fetchMe: jest.fn(),
}));

import { fetchMe } from '../../api/me';
import { fetchMeWithRetry } from '../profileHydration';

const mockFetchMe = fetchMe as jest.MockedFunction<typeof fetchMe>;

const me = {
  id: 1,
  nickname: 'Tester',
  avatarColor: '#ff2d87',
  profileImageUrl: null,
  streak: 0,
  wins: 0,
  losses: 0,
  bestDb: 97.5,
  createdAt: '2026-06-07T00:00:00.000Z',
  termsVersion: '1.0',
  privacyVersion: '1.1',
};

describe('fetchMeWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('첫 요청이 성공하면 바로 프로필을 반환한다', async () => {
    mockFetchMe.mockResolvedValueOnce(me);

    await expect(fetchMeWithRetry(2, 0)).resolves.toEqual(me);
    expect(mockFetchMe).toHaveBeenCalledTimes(1);
  });

  it('첫 요청이 실패하면 한 번 더 시도해 성공 결과를 반환한다', async () => {
    mockFetchMe
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(me);

    await expect(fetchMeWithRetry(2, 0)).resolves.toEqual(me);
    expect(mockFetchMe).toHaveBeenCalledTimes(2);
  });

  it('모든 재시도가 실패하면 마지막 에러를 던진다', async () => {
    const first = new Error('network');
    const second = new Error('server');
    mockFetchMe
      .mockRejectedValueOnce(first)
      .mockRejectedValueOnce(second);

    await expect(fetchMeWithRetry(2, 0)).rejects.toThrow('server');
    expect(mockFetchMe).toHaveBeenCalledTimes(2);
  });
});
