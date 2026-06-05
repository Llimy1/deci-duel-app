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
  opponentLeft: false,
  matchSessionId: null,
  countdown: null,
  currentRound: 1,
  myScore: 0,
  oppScore: 0,
  roundResult: null,
  roundResults: [],
  finalResult: null,
  disconnectedWaitSecs: null,
  opponentReady: false,
  opponentMicReady: false,
  opponentDb: 0,
  opponentPeakDb: 0,
  roundDurationMs: 5000,
  prepareTimeoutMs: null,
  rematchMatchedAt: null,
  errorMessage: null,
  hasSubmittedRound: false,
  matchPrepareFailed: false,
  matchPrepareFailedMessage: null,
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

/* ───────────────── [23:49] 마이크 준비 handshake ───────────────── */

describe('round:prepare', () => {
  it('status를 preparing으로 바꾸고 라운드별 상태를 초기화한다', () => {
    useGameStore.setState({ opponentMicReady: true, opponentDb: 50, hasSubmittedRound: true });
    trigger('round:prepare', { round: 2, prepareTimeoutMs: 3000 });

    const s = useGameStore.getState();
    expect(s.status).toBe('preparing');
    expect(s.currentRound).toBe(2);
    expect(s.opponentMicReady).toBe(false);
    expect(s.opponentDb).toBe(0);
    expect(s.hasSubmittedRound).toBe(false);
    expect(s.countdown).toBeNull();
  });

  it('prepareTimeoutMs를 state에 저장한다', () => {
    trigger('round:prepare', { round: 1, prepareTimeoutMs: 3000 });
    expect(useGameStore.getState().prepareTimeoutMs).toBe(3000);
  });

  it('prepareTimeoutMs가 없으면 null로 저장한다 (구 서버 호환)', () => {
    useGameStore.setState({ prepareTimeoutMs: 3000 });
    trigger('round:prepare', { round: 1 });
    expect(useGameStore.getState().prepareTimeoutMs).toBeNull();
  });
});

describe('opponent:mic-ready', () => {
  it('opponentMicReady를 true로 설정한다', () => {
    expect(useGameStore.getState().opponentMicReady).toBe(false);
    trigger('opponent:mic-ready');
    expect(useGameStore.getState().opponentMicReady).toBe(true);
  });
});

describe('round:start', () => {
  it('durationMs를 roundDurationMs에 저장하고 playing으로 전환한다', () => {
    trigger('round:start', { round: 3, durationMs: 5000 });
    const s = useGameStore.getState();
    expect(s.status).toBe('playing');
    expect(s.currentRound).toBe(3);
    expect(s.roundDurationMs).toBe(5000);
    expect(s.opponentMicReady).toBe(false);
  });

  it('durationMs가 없으면 기본 5000ms를 사용한다 (구 서버 호환)', () => {
    useGameStore.setState({ roundDurationMs: 9999 });
    trigger('round:start', { round: 1 });
    expect(useGameStore.getState().roundDurationMs).toBe(5000);
  });
});

describe('sendMicReady', () => {
  it('소켓 미연결 시 false를 반환하고 emit하지 않는다', () => {
    mockSocket.connected = false;
    const result = useGameStore.getState().sendMicReady(1);
    expect(result).toBe(false);
    mockSocket.connected = true;
  });

  it('소켓 연결 시 round:mic-ready를 emit하고 true를 반환한다', () => {
    mockSocket.connected = true;
    useGameStore.setState({ socket: mockSocket as never });
    const result = useGameStore.getState().sendMicReady(2);
    expect(result).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('round:mic-ready', { round: 2 });
  });
});

describe('match:prepare-failed', () => {
  it('수신 시 matchPrepareFailed=true, status=matched, 게임 상태 초기화', () => {
    // preparing 상태에서 시작
    useGameStore.setState({
      status: 'preparing',
      currentRound: 2,
      finalResult: { result: 'win', myScore: 1, oppScore: 0, rounds: [] } as any,
      hasSubmittedRound: true,
    });

    trigger('match:prepare-failed', {
      reason: 'mic_prepare_failed',
      failedUserIds: [1],
      round: 2,
      retryable: true,
      message: '마이크를 준비하지 못해 대결 시작이 취소되었습니다.',
    });

    const state = useGameStore.getState();
    expect(state.matchPrepareFailed).toBe(true);
    expect(state.status).toBe('matched');
    expect(state.currentRound).toBe(1);
    expect(state.finalResult).toBeNull();
    expect(state.hasSubmittedRound).toBe(false);
    expect(state.matchPrepareFailedMessage).toBe('마이크를 준비하지 못해 대결 시작이 취소되었습니다.');
  });

  it('match:prepare-failed 수신 후 opponentLeft는 변경되지 않는다 (방에 아직 있음)', () => {
    // match:prepare-failed는 game:over가 아님 — 방에 두 명 고정, opponentLeft는 false 유지
    useGameStore.setState({ status: 'preparing', opponentLeft: false });
    trigger('match:prepare-failed', { reason: 'timeout', failedUserIds: [1], round: 1, retryable: true, message: 'test' });
    expect(useGameStore.getState().opponentLeft).toBe(false);
    expect(useGameStore.getState().matchPrepareFailed).toBe(true);
  });

  it('clearMatchPrepareFailed() 호출 시 초기화', () => {
    useGameStore.setState({ matchPrepareFailed: true, matchPrepareFailedMessage: 'test' });
    useGameStore.getState().clearMatchPrepareFailed();
    expect(useGameStore.getState().matchPrepareFailed).toBe(false);
    expect(useGameStore.getState().matchPrepareFailedMessage).toBeNull();
  });

  it('round:prepare 수신 시 matchPrepareFailed 초기화', () => {
    useGameStore.setState({ matchPrepareFailed: true });
    trigger('round:prepare', { round: 1, prepareTimeoutMs: 8000 });
    expect(useGameStore.getState().matchPrepareFailed).toBe(false);
  });

  it('remainingPrepareTimeoutMs가 prepareTimeoutMs보다 우선', () => {
    trigger('round:prepare', {
      round: 1,
      prepareTimeoutMs: 8000,
      remainingPrepareTimeoutMs: 3500,
    });
    expect(useGameStore.getState().prepareTimeoutMs).toBe(3500);
  });
});

describe('sendMicError', () => {
  it('reason과 함께 round:mic-error를 emit한다', () => {
    mockSocket.connected = true;
    useGameStore.setState({ socket: mockSocket as never });
    useGameStore.getState().sendMicError(1, 'mic_not_ready');
    expect(mockSocket.emit).toHaveBeenCalledWith('round:mic-error', { round: 1, reason: 'mic_not_ready' });
  });

  it('reason이 없으면 round만 포함해 emit한다', () => {
    mockSocket.connected = true;
    useGameStore.setState({ socket: mockSocket as never });
    useGameStore.getState().sendMicError(1);
    expect(mockSocket.emit).toHaveBeenCalledWith('round:mic-error', { round: 1 });
  });

  it('소켓 미연결 시 emit하지 않는다', () => {
    mockSocket.connected = false;
    useGameStore.getState().sendMicError(1);
    expect(mockSocket.emit).not.toHaveBeenCalledWith('round:mic-error', expect.anything());
    mockSocket.connected = true;
  });
});

/* ─────────────────────────── opponent:left ────────────────────────────── */

describe('opponent:left', () => {
  it('opponentLeft=true, status=waiting으로 전환하고 게임 상태를 초기화한다', () => {
    useGameStore.setState({
      status: 'matched',
      opponent: { id: 2, nickname: 'B', avatarColor: '#fff', profileImageUrl: null, bestDb: 80 },
      myScore: 1,
      oppScore: 0,
      currentRound: 2,
      opponentLeft: false,
    });

    trigger('opponent:left', {});

    const s = useGameStore.getState();
    expect(s.opponentLeft).toBe(true);
    expect(s.status).toBe('waiting');
    expect(s.opponent).toBeNull();
    expect(s.myScore).toBe(0);
    expect(s.currentRound).toBe(1);
  });

  it('payload 없이 수신해도 처리된다 (구 서버 호환)', () => {
    // 일부 서버는 빈 payload를 보낼 수 있음
    expect(() => trigger('opponent:left', undefined)).not.toThrow();
    expect(useGameStore.getState().opponentLeft).toBe(true);
  });

  it('clearOpponentLeft() 호출 시 초기화', () => {
    useGameStore.setState({ opponentLeft: true });
    useGameStore.getState().clearOpponentLeft();
    expect(useGameStore.getState().opponentLeft).toBe(false);
  });
});

/* ─────────────────────────── room:host_transferred ────────────────────── */

describe('room:host_transferred', () => {
  it('opponentLeft=true, isHost=true, status=waiting으로 전환한다', () => {
    useGameStore.setState({
      status: 'matched',
      isHost: false,
      roomCode: 'OLD',
      opponentLeft: false,
    });

    trigger('room:host_transferred', { roomCode: 'NEW' });

    const s = useGameStore.getState();
    expect(s.opponentLeft).toBe(true);
    expect(s.isHost).toBe(true);
    expect(s.roomCode).toBe('NEW');
    expect(s.status).toBe('waiting');
    expect(s.opponent).toBeNull();
  });
});

/* ─────────────────────────── matchSessionId ───────────────────────────── */

describe('matchSessionId', () => {
  it('room:joined 에서 matchSessionId를 저장한다', () => {
    trigger('room:joined', {
      roomCode: 'ABC1',
      isHost: false,
      opponent: { userId: 2, nickname: 'B', avatarColor: '#fff' },
      matchSessionId: 'sess-001',
    });
    expect(useGameStore.getState().matchSessionId).toBe('sess-001');
  });

  it('opponent:joined 에서 matchSessionId를 저장한다', () => {
    trigger('opponent:joined', {
      userId: 2,
      nickname: 'B',
      avatarColor: '#fff',
      matchSessionId: 'sess-002',
    });
    expect(useGameStore.getState().matchSessionId).toBe('sess-002');
  });

  it('matchSessionId 없는 이벤트는 null로 저장 (구 서버 호환)', () => {
    trigger('room:joined', {
      roomCode: 'ABC2',
      isHost: true,
      opponent: { userId: 3, nickname: 'C', avatarColor: '#abc' },
    });
    expect(useGameStore.getState().matchSessionId).toBeNull();
  });
});
