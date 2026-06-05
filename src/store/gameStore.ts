import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Toast } from '../utils/toast';
import type { OpponentInfo, RoundRecord } from '../types/game';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const GAME_NAMESPACE_URL = `${API_BASE_URL}/game`;

type GameStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'matched'
  | 'ready'
  | 'countdown'
  | 'preparing'
  | 'playing'
  | 'roundResult'
  | 'gameOver'
  | 'rematchWaiting';

type ServerOpponent = {
  userId: number;
  nickname: string;
  avatarColor: string;
  profileImageUrl?: string | null;
  bestDb?: number;
};

type RoundResultPayload = {
  round: number;
  myDb: number;
  oppDb: number;
  roundResult: 'win' | 'lose' | 'draw';
  myScore: number;
  oppScore: number;
};

type GameOverPayload = {
  result: 'win' | 'lose' | 'draw';
  myScore: number;
  oppScore: number;
  rounds: Array<{
    round: number;
    myDb: number;
    oppDb: number;
    result?: 'win' | 'lose' | 'draw';
    roundResult?: 'win' | 'lose' | 'draw';
  }>;
  forfeit?: true;
};

type NormalizedGameOver = Omit<GameOverPayload, 'rounds'> & {
  rounds: RoundRecord[];
};

interface GameSocketState {
  socket: Socket | null;
  status: GameStatus;
  roomCode: string | null;
  opponent: OpponentInfo | null;
  isHost: boolean;
  /** 상대방이 명시적으로 방을 나감. 각 화면에서 "상대가 나갔습니다" UI 트리거 */
  opponentLeft: boolean;
  /** 서버가 구현되면 채워지는 세션 ID — stale 이벤트 guard용 */
  matchSessionId: string | null;
  countdown: number | null;
  currentRound: number;
  myScore: number;
  oppScore: number;
  roundResult: RoundRecord | null;
  roundResults: RoundRecord[];
  finalResult: NormalizedGameOver | null;
  disconnectedWaitSecs: number | null;
  opponentReady: boolean;
  opponentMicReady: boolean;
  opponentDb: number;
  opponentPeakDb: number;
  roundDurationMs: number;
  /** 서버가 round:prepare에서 내려준 prepare timeout(ms). null이면 서버가 handshake 미지원 */
  prepareTimeoutMs: number | null;
  rematchMatchedAt: number | null;
  errorMessage: string | null;
  hasSubmittedRound: boolean;
  /** match:prepare-failed 이벤트 수신 시 true. GameScreen → MatchFound 이동 트리거 */
  matchPrepareFailed: boolean;
  /** match:prepare-failed 이유 메시지 */
  matchPrepareFailedMessage: string | null;
  connectSocket: (accessToken: string) => Socket | null;
  disconnectSocket: () => void;
  leaveRoom: () => void;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  /** 기존 방을 정리하고 새 방을 생성 (소켓 유지) — "새 방 만들기" UX용 */
  switchToNewRoom: () => void;
  sendReady: () => boolean;
  sendMicReady: (round: number) => boolean;
  sendMicError: (round: number, reason?: string) => void;
  sendRoundDb: (round: number, db: number) => void;
  submitRound: (round: number, peakDb: number) => void;
  requestRematch: () => void;
  clearRoundSubmit: () => void;
  clearError: () => void;
  clearOpponentLeft: () => void;
  clearMatchPrepareFailed: () => void;
  resetGameState: () => void;
}

const initialGameState = {
  socket: null,
  status: 'idle' as GameStatus,
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

function toOpponentInfo(opponent: ServerOpponent): OpponentInfo {
  return {
    id: opponent.userId,
    nickname: opponent.nickname,
    avatarColor: opponent.avatarColor,
    profileImageUrl: opponent.profileImageUrl ?? null,
    bestDb: opponent.bestDb ?? 0,
  };
}

function normalizeRound(round: GameOverPayload['rounds'][number]): RoundRecord {
  const result = round.result
    ?? round.roundResult
    ?? (round.myDb === round.oppDb ? 'draw' : round.myDb > round.oppDb ? 'win' : 'lose');

  return {
    round: round.round,
    myDb: round.myDb,
    oppDb: round.oppDb,
    result,
  };
}

function setupSocketHandlers(socket: Socket) {
  socket.on('connect', () => {
    useGameStore.setState((state) => ({
      // 재연결 시 진행 중인 게임 상태를 idle로 덮어쓰지 않음
      status: ['connecting', 'idle'].includes(state.status) ? 'idle' : state.status,
      errorMessage: null,
    }));
  });

  socket.on('connect_error', (error) => {
    const message = error.message || '게임 서버에 연결하지 못했습니다.';
    useGameStore.setState({ status: 'idle', errorMessage: message });
    Toast.error(message);
  });

  socket.on('disconnect', () => {
    useGameStore.setState((state) => ({
      status: state.status === 'gameOver' ? state.status : 'idle',
    }));
  });

  socket.on('room:created', ({ roomCode }: { roomCode: string }) => {
    useGameStore.setState({
      roomCode,
      isHost: true,
      status: 'waiting',
      opponent: null,
      countdown: null,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      opponentLeft: false,
      matchSessionId: null,
    });
  });

  socket.on('room:joined', ({ roomCode, isHost, opponent, matchSessionId }: { roomCode: string; isHost: boolean; opponent: ServerOpponent; matchSessionId?: string }) => {
    useGameStore.setState({
      roomCode,
      isHost,
      opponent: toOpponentInfo(opponent),
      status: 'matched',
      matchSessionId: matchSessionId ?? null,
      countdown: null,
      currentRound: 1,
      myScore: 0,
      oppScore: 0,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      rematchMatchedAt: null,
      disconnectedWaitSecs: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      hasSubmittedRound: false,
      opponentLeft: false,
    });
  });

  socket.on('opponent:joined', (payload: ServerOpponent & { isHost?: boolean; matchSessionId?: string }) => {
    useGameStore.setState({
      opponent: toOpponentInfo(payload),
      isHost: payload.isHost ?? true,
      status: 'matched',
      matchSessionId: payload.matchSessionId ?? null,
      countdown: null,
      currentRound: 1,
      myScore: 0,
      oppScore: 0,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      rematchMatchedAt: null,
      disconnectedWaitSecs: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      hasSubmittedRound: false,
      opponentLeft: false,
    });
  });

  socket.on('opponent:ready', () => {
    useGameStore.setState({ opponentReady: true });
  });

  socket.on('round:countdown', ({ count }: { count: number }) => {
    useGameStore.setState({
      status: 'countdown',
      countdown: count,
      roundResult: null,
      hasSubmittedRound: false,
    });
  });

  // [23:49 handshake] 서버가 양쪽 마이크 준비를 요청 — round:start 이전 단계.
  // 구 서버(round:prepare 미전송)에서는 발생하지 않으므로 기존 흐름과 호환된다.
  socket.on('round:prepare', ({
    round,
    prepareTimeoutMs,
    remainingPrepareTimeoutMs,
  }: {
    round: number;
    prepareTimeoutMs?: number;
    remainingPrepareTimeoutMs?: number;
  }) => {
    useGameStore.setState({
      status: 'preparing',
      currentRound: round,
      // remainingPrepareTimeoutMs가 있으면 실제 남은 시간 우선 사용 (재연결 케이스)
      prepareTimeoutMs: remainingPrepareTimeoutMs ?? prepareTimeoutMs ?? null,
      countdown: null,
      roundResult: null,
      opponentReady: false,
      opponentMicReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      hasSubmittedRound: false,
      opponentLeft: false,
      matchPrepareFailed: false,
      matchPrepareFailedMessage: null,
    });
  });

  // 상대방 마이크 준비 완료 (선택적 서버 이벤트) — 준비 대기 UI 갱신용
  socket.on('opponent:mic-ready', () => {
    useGameStore.setState({ opponentMicReady: true });
  });

  // 상대방 마이크 준비 실패 (선택적 서버 이벤트)
  socket.on('opponent:mic-error', () => {
    Toast.info('상대방이 마이크를 준비하지 못했습니다.');
  });

  socket.on('round:start', ({ round, durationMs }: { round: number; durationMs?: number }) => {
    useGameStore.setState({
      status: 'playing',
      currentRound: round,
      roundDurationMs: durationMs ?? 5000,
      countdown: null,
      roundResult: null,
      opponentReady: false,
      opponentMicReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      hasSubmittedRound: false,
      rematchMatchedAt: null,
      opponentLeft: false,
    });
  });

  socket.on('opponent:db', ({ round, db }: { round: number; db: number }) => {
    useGameStore.setState((state) => {
      if (state.currentRound !== round) return state;
      const clampedDb = Math.max(0, Math.min(200, db));
      return {
        opponentDb: clampedDb,
        opponentPeakDb: Math.max(state.opponentPeakDb, clampedDb),
      };
    });
  });

  socket.on('round:result', (payload: RoundResultPayload) => {
    const record: RoundRecord = {
      round: payload.round,
      myDb: payload.myDb,
      oppDb: payload.oppDb,
      result: payload.roundResult,
    };
    useGameStore.setState((state) => ({
      status: 'roundResult',
      currentRound: payload.round,
      myScore: payload.myScore,
      oppScore: payload.oppScore,
      roundResult: record,
      roundResults: [...state.roundResults.filter((item) => item.round !== record.round), record],
      hasSubmittedRound: false,
    }));
  });

  socket.on('game:over', (payload: GameOverPayload) => {
    const rounds = payload.rounds.map(normalizeRound);
    useGameStore.setState({
      status: 'gameOver',
      finalResult: { ...payload, rounds },
      myScore: payload.myScore,
      oppScore: payload.oppScore,
      roundResults: rounds,
      disconnectedWaitSecs: null,
    });
  });

  socket.on('rematch:waiting', ({ roomCode }: { roomCode: string }) => {
    useGameStore.setState({
      roomCode,
      status: 'rematchWaiting',
      finalResult: null,
      errorMessage: null,
    });
  });

  socket.on('rematch:matched', ({ roomCode, matchSessionId }: { roomCode: string; matchSessionId?: string }) => {
    useGameStore.setState((state) => ({
      roomCode,
      status: 'matched',
      matchSessionId: matchSessionId ?? null,
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
      rematchMatchedAt: Date.now(),
      hasSubmittedRound: false,
      opponentLeft: false,
      socket: state.socket,
      opponent: state.opponent,
    }));
  });

  socket.on('match:prepare-failed', ({
    message,
  }: {
    reason: string;
    failedUserIds: number[];
    round: number;
    retryable: boolean;
    message: string;
  }) => {
    useGameStore.setState((state) => ({
      matchPrepareFailed: true,
      matchPrepareFailedMessage: message,
      // matched 상태로 복귀, stale game data 초기화
      status: 'matched',
      currentRound: 1,
      myScore: 0,
      oppScore: 0,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      opponentReady: false,
      opponentMicReady: false,
      hasSubmittedRound: false,
      prepareTimeoutMs: null,
      // roomCode, opponent, isHost는 유지 (방에 아직 있음)
      roomCode: state.roomCode,
      opponent: state.opponent,
      isHost: state.isHost,
    }));
  });

  socket.on('opponent:left', ({
    reason,
    canRematch,
  }: {
    roomCode?: string;
    reason?: 'left' | 'disconnect_timeout' | 'setup_cancel';
    canWaitForNewOpponent?: boolean;
    canRematch?: boolean;
  } = {}) => {
    // 상대방이 명시적으로 나감 → opponentLeft=true로 각 화면에서 "새 방 만들기/홈으로" UI 표시
    // (canRematch, reason은 서버 구현 후 활용 예정)
    useGameStore.setState({
      opponentLeft: true,
      status: 'waiting',
      opponent: null,
      countdown: null,
      currentRound: 1,
      myScore: 0,
      oppScore: 0,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      rematchMatchedAt: null,
      disconnectedWaitSecs: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      hasSubmittedRound: false,
    });
  });

  socket.on('room:host_transferred', ({
    roomCode,
    canRematch,
  }: {
    roomCode: string;
    canWaitForNewOpponent?: boolean;
    canRematch?: boolean;
  }) => {
    // 방장이 나감 → 내가 새 방장으로 승격
    // (canRematch는 서버 구현 후 활용 예정)
    useGameStore.setState({
      roomCode,
      isHost: true,
      opponentLeft: true,
      status: 'waiting',
      opponent: null,
      countdown: null,
      currentRound: 1,
      myScore: 0,
      oppScore: 0,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      rematchMatchedAt: null,
      disconnectedWaitSecs: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      hasSubmittedRound: false,
    });
  });

  socket.on('opponent:disconnected', ({ waitSecs }: { waitSecs: number }) => {
    useGameStore.setState({ disconnectedWaitSecs: waitSecs });
    Toast.info(
      waitSecs > 0
        ? `상대방 연결이 끊겼습니다. ${waitSecs}초 대기 중...`
        : '상대방 연결이 끊겼습니다.',
      3000
    );
  });

  socket.on('opponent:reconnected', () => {
    useGameStore.setState({ disconnectedWaitSecs: null });
    Toast.success('상대방이 다시 연결되었습니다.');
  });

  socket.on('room:reconnected', ({
    roomCode, isHost, myScore, oppScore, roundResults, opponent,
  }: {
    roomCode: string;
    isHost: boolean;
    myScore: number;
    oppScore: number;
    roundResults: Array<{ round: number; myDb: number; oppDb: number }>;
    opponent: { userId: number; nickname: string; avatarColor: string; profileImageUrl: string | null; bestDb: number } | null;
  }) => {
    const normalizedRounds: RoundRecord[] = roundResults.map((r) => ({
      round: r.round,
      myDb: r.myDb,
      oppDb: r.oppDb,
      result: r.myDb === r.oppDb ? 'draw' : r.myDb > r.oppDb ? 'win' : 'lose',
    }));
    const opponentInfo: OpponentInfo | null = opponent
      ? {
          id: opponent.userId,
          nickname: opponent.nickname,
          avatarColor: opponent.avatarColor,
          profileImageUrl: opponent.profileImageUrl,
          bestDb: opponent.bestDb,
        }
      : null;
    useGameStore.setState({
      roomCode,
      isHost,
      myScore,
      oppScore,
      currentRound: roundResults.length + 1,
      roundResults: normalizedRounds,
      opponent: opponentInfo,
      disconnectedWaitSecs: null,
      status: 'matched', // 서버가 이어서 round:countdown 또는 round:start를 전송
    });
    Toast.success('게임에 다시 연결되었습니다.');
  });

  socket.on('error', ({ message }: { message: string }) => {
    useGameStore.setState((state) => ({
      status: state.status === 'connecting' ? 'idle' : state.status,
      roomCode: state.status === 'connecting' ? null : state.roomCode,
      errorMessage: message,
    }));
    Toast.error(message);
  });
}

export const useGameStore = create<GameSocketState>((set, get) => ({
  ...initialGameState,
  connectSocket: (accessToken) => {
    const current = get().socket;
    if (current?.connected) return current;

    current?.removeAllListeners();
    current?.disconnect();

    const socket = io(GAME_NAMESPACE_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
    });

    setupSocketHandlers(socket);
    set({ ...initialGameState, socket, status: 'connecting' });
    return socket;
  },
  disconnectSocket: () => {
    const { socket } = get();
    socket?.removeAllListeners();
    socket?.disconnect();
    set({ ...initialGameState });
  },
  leaveRoom: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('room:leave');
      setTimeout(() => {
        socket.removeAllListeners();
        socket.disconnect();
      }, 80);
    } else {
      socket?.removeAllListeners();
      socket?.disconnect();
    }
    set({ ...initialGameState });
  },
  createRoom: () => {
    const { socket } = get();
    if (!socket?.connected) {
      Toast.error('게임 서버에 연결되지 않았습니다.');
      return;
    }
    set({
      status: 'waiting',
      roomCode: null,
      opponent: null,
      countdown: null,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      hasSubmittedRound: false,
    });
    socket.emit('room:create');
  },
  joinRoom: (roomCode) => {
    const { socket } = get();
    if (!socket?.connected) {
      Toast.error('게임 서버에 연결되지 않았습니다.');
      return;
    }
    set({
      status: 'connecting',
      roomCode: roomCode.toUpperCase(),
      opponent: null,
      countdown: null,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      errorMessage: null,
      hasSubmittedRound: false,
    });
    socket.emit('room:join', { roomCode: roomCode.toUpperCase() });
  },
  sendReady: () => {
    const { socket } = get();
    if (!socket?.connected) {
      Toast.error('게임 서버에 연결되지 않았습니다.');
      return false;
    }
    set({ status: 'ready' });
    socket.emit('game:ready');
    return true;
  },
  sendMicReady: (round) => {
    const { socket } = get();
    if (!socket?.connected) return false;
    socket.emit('round:mic-ready', { round });
    return true;
  },
  sendMicError: (round, reason) => {
    const { socket } = get();
    if (!socket?.connected) return;
    socket.emit('round:mic-error', reason ? { round, reason } : { round });
  },
  sendRoundDb: (round, db) => {
    const { socket } = get();
    if (!socket?.connected) return;
    socket.emit('round:db', { round, db: Math.max(0, Math.min(200, db)) });
  },
  submitRound: (round, peakDb) => {
    const { socket, hasSubmittedRound } = get();
    if (!socket?.connected || hasSubmittedRound) return;
    set({ hasSubmittedRound: true });
    socket.emit('round:submit', { round, peakDb: Math.max(0, Math.min(200, peakDb)) });
  },
  requestRematch: () => {
    const { socket } = get();
    if (!socket?.connected) {
      Toast.error('게임 서버에 연결되지 않았습니다.');
      return;
    }
    socket.emit('game:rematch');
  },
  switchToNewRoom: () => {
    const { socket } = get();
    if (!socket?.connected) {
      Toast.error('게임 서버에 연결되지 않았습니다.');
      return;
    }
    // 기존 방 정리 + 새 방 생성 (소켓 유지 — leaveRoom()은 disconnect하므로 직접 emit)
    socket.emit('room:leave');
    set({ ...initialGameState, socket, status: 'waiting' });
    socket.emit('room:create');
  },
  clearRoundSubmit: () => set({ hasSubmittedRound: false }),
  clearError: () => set({ errorMessage: null }),
  clearOpponentLeft: () => set({ opponentLeft: false }),
  clearMatchPrepareFailed: () => set({ matchPrepareFailed: false, matchPrepareFailedMessage: null }),
  resetGameState: () => set((state) => ({ ...initialGameState, socket: state.socket })),
}));
