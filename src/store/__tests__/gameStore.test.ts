/**
 * gameStore 소켓 상태 전환 단위 테스트
 *
 * 검증 항목:
 *  1. room:reconnected → 전체 게임 상태 복원
 *  2. connect 이벤트 → 게임 진행 중 status를 idle로 덮어쓰지 않음
 *  3. sendReady → 소켓 미연결 시 false 반환
 */

// socket.io-client mock — connectSocket 호출 시 반환되는 가짜 소켓
const mockSocketHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockSocket = {
  connected: true,
  on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    mockSocketHandlers[event] = handler;
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(() => {
    Object.keys(mockSocketHandlers).forEach(k => delete mockSocketHandlers[k]);
  }),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

import { useGameStore } from '../gameStore';

// helper: 등록된 이벤트 핸들러를 직접 실행
const trigger = (event: string, payload?: unknown) => {
  const handler = mockSocketHandlers[event];
  if (!handler) throw new Error(`핸들러 없음: "${event}" (등록된 이벤트: ${Object.keys(mockSocketHandlers).join(', ')})`);
  handler(payload);
};

const INITIAL_STATE_FIELDS = {
  socket: null,
  status: 'idle' as const,
  roomCode: null,
  opponent: null,
  isHost: false,
  goToWaitingRoom: false,
  countdown: null,
  currentRound: 1,
  myScore: 0,
  oppScore: 0,
  roundResult: null,
  roundResults: [],
  finalResult: null,
  disconnectedWaitSecs: null,
  opponentReady: false,
  opponentDb: 0,
  opponentPeakDb: 0,
  rematchMatchedAt: null,
  errorMessage: null,
  hasSubmittedRound: false,
};

beforeEach(() => {
  // 상태 초기화
  useGameStore.setState(INITIAL_STATE_FIELDS);
  // 핸들러 및 mock 초기화
  Object.keys(mockSocketHandlers).forEach(k => delete mockSocketHandlers[k]);
  mockSocket.on.mockClear();
  mockSocket.emit.mockClear();
  // connectSocket으로 핸들러 등록
  useGameStore.getState().connectSocket('fake-access-token');
});

/* ─────────────────────────── room:reconnected ─────────────────────────── */

describe('room:reconnected', () => {
  it('전체 게임 상태(점수/라운드/상대 정보)를 복원한다', () => {
    trigger('room:reconnected', {
      roomCode: 'ABC123',
      isHost: false,
      myScore: 1,
      oppScore: 0,
      roundResults: [{ round: 1, myDb: 80, oppDb: 70 }],
      opponent: {
        userId: 2,
        nickname: '상대방',
        avatarColor: '#FF0000',
        profileImageUrl: null,
        bestDb: 80,
      },
    });

    const s = useGameStore.getState();
    expect(s.roomCode).toBe('ABC123');
    expect(s.isHost).toBe(false);
    expect(s.myScore).toBe(1);
    expect(s.oppScore).toBe(0);
    expect(s.currentRound).toBe(2); // roundResults.length + 1
    expect(s.roundResults).toHaveLength(1);
    expect(s.roundResults[0]).toMatchObject({ round: 1, myDb: 80, oppDb: 70, result: 'win' });
    expect(s.opponent?.nickname).toBe('상대방');
    expect(s.opponent?.profileImageUrl).toBeNull();
    expect(s.status).toBe('matched');
    expect(s.disconnectedWaitSecs).toBeNull();
  });

  it('roundResults가 비어 있으면 currentRound = 1', () => {
    trigger('room:reconnected', {
      roomCode: 'XYZ999',
      isHost: true,
      myScore: 0,
      oppScore: 0,
      roundResults: [],
      opponent: null,
    });

    const s = useGameStore.getState();
    expect(s.currentRound).toBe(1);
    expect(s.roomCode).toBe('XYZ999');
    expect(s.opponent).toBeNull();
  });

  it('동점 라운드 결과는 draw로 정규화된다', () => {
    trigger('room:reconnected', {
      roomCode: 'DRAW11',
      isHost: true,
      myScore: 0,
      oppScore: 0,
      roundResults: [{ round: 1, myDb: 75, oppDb: 75 }],
      opponent: null,
    });

    expect(useGameStore.getState().roundResults[0].result).toBe('draw');
  });

  it('profileImageUrl이 서버에서 내려오면 opponent에 반영된다', () => {
    trigger('room:reconnected', {
      roomCode: 'IMG123',
      isHost: false,
      myScore: 0,
      oppScore: 0,
      roundResults: [],
      opponent: {
        userId: 5,
        nickname: '이미지유저',
        avatarColor: '#00FF00',
        profileImageUrl: 'https://cdn.example.com/img.jpg',
        bestDb: 60,
      },
    });

    expect(useGameStore.getState().opponent?.profileImageUrl).toBe('https://cdn.example.com/img.jpg');
  });
});

/* ─────────────────────────── connect 이벤트 ─────────────────────────── */

describe('connect 이벤트', () => {
  it('게임 진행 중(playing) status를 idle로 덮어쓰지 않는다', () => {
    useGameStore.setState({ status: 'playing' });
    trigger('connect');
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('countdown 상태도 idle로 덮어쓰지 않는다', () => {
    useGameStore.setState({ status: 'countdown' });
    trigger('connect');
    expect(useGameStore.getState().status).toBe('countdown');
  });

  it('connecting 상태는 idle로 리셋된다', () => {
    useGameStore.setState({ status: 'connecting' });
    trigger('connect');
    expect(useGameStore.getState().status).toBe('idle');
  });

  it('idle 상태는 idle을 유지한다', () => {
    useGameStore.setState({ status: 'idle' });
    trigger('connect');
    expect(useGameStore.getState().status).toBe('idle');
  });

  it('errorMessage를 초기화한다', () => {
    useGameStore.setState({ errorMessage: '이전 오류', status: 'playing' });
    trigger('connect');
    expect(useGameStore.getState().errorMessage).toBeNull();
  });
});

/* ─────────────────────────── sendReady ─────────────────────────── */

describe('sendReady', () => {
  it('소켓 미연결 시 false를 반환한다', () => {
    mockSocket.connected = false;
    const result = useGameStore.getState().sendReady();
    expect(result).toBe(false);
    mockSocket.connected = true;
  });

  it('소켓 연결 시 true를 반환하고 game:ready를 emit한다', () => {
    mockSocket.connected = true;
    // socket이 store에 저장되어 있어야 함
    useGameStore.setState({ socket: mockSocket as never, status: 'matched' });
    const result = useGameStore.getState().sendReady();
    expect(result).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('game:ready');
  });
});

/* ─────────────────────────── opponent:disconnected ─────────────────────────── */

describe('opponent:disconnected', () => {
  it('waitSecs > 0이면 disconnectedWaitSecs에 저장된다', () => {
    trigger('opponent:disconnected', { waitSecs: 10 });
    expect(useGameStore.getState().disconnectedWaitSecs).toBe(10);
  });

  it('waitSecs = 0이면 disconnectedWaitSecs = 0으로 저장된다', () => {
    trigger('opponent:disconnected', { waitSecs: 0 });
    expect(useGameStore.getState().disconnectedWaitSecs).toBe(0);
  });
});

/* ─────────────────────────── opponent:reconnected ─────────────────────────── */

describe('opponent:reconnected', () => {
  it('disconnectedWaitSecs를 null로 초기화한다', () => {
    useGameStore.setState({ disconnectedWaitSecs: 5 });
    trigger('opponent:reconnected');
    expect(useGameStore.getState().disconnectedWaitSecs).toBeNull();
  });
});
