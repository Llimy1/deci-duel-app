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
  goToWaitingRoom: boolean;
  countdown: number | null;
  currentRound: number;
  myScore: number;
  oppScore: number;
  roundResult: RoundRecord | null;
  roundResults: RoundRecord[];
  finalResult: NormalizedGameOver | null;
  disconnectedWaitSecs: number | null;
  opponentReady: boolean;
  opponentDb: number;
  opponentPeakDb: number;
  rematchMatchedAt: number | null;
  errorMessage: string | null;
  hasSubmittedRound: boolean;
  connectSocket: (accessToken: string) => Socket | null;
  disconnectSocket: () => void;
  leaveRoom: () => void;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  sendReady: () => boolean;
  sendRoundDb: (round: number, db: number) => void;
  submitRound: (round: number, peakDb: number) => void;
  requestRematch: () => void;
  clearRoundSubmit: () => void;
  clearError: () => void;
  clearGoToWaitingRoom: () => void;
  resetGameState: () => void;
}

const initialGameState = {
  socket: null,
  status: 'idle' as GameStatus,
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
      goToWaitingRoom: false,
    });
  });

  socket.on('room:joined', ({ roomCode, isHost, opponent }: { roomCode: string; isHost: boolean; opponent: ServerOpponent }) => {
    useGameStore.setState({
      roomCode,
      isHost,
      opponent: toOpponentInfo(opponent),
      status: 'matched',
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
      goToWaitingRoom: false,
    });
  });

  socket.on('opponent:joined', (payload: ServerOpponent & { isHost?: boolean }) => {
    useGameStore.setState({
      opponent: toOpponentInfo(payload),
      isHost: payload.isHost ?? true,
      status: 'matched',
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
      goToWaitingRoom: false,
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

  socket.on('round:start', ({ round }: { round: number }) => {
    useGameStore.setState({
      status: 'playing',
      currentRound: round,
      countdown: null,
      roundResult: null,
      opponentReady: false,
      opponentDb: 0,
      opponentPeakDb: 0,
      hasSubmittedRound: false,
      rematchMatchedAt: null,
      goToWaitingRoom: false,
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

  socket.on('rematch:matched', ({ roomCode }: { roomCode: string }) => {
    useGameStore.setState((state) => ({
      roomCode,
      status: 'matched',
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
      socket: state.socket,
      opponent: state.opponent,
    }));
  });

  socket.on('opponent:left', () => {
    // 게스트가 나감 → 방장은 WaitingRoom으로 이동, 게임 상태 초기화
    useGameStore.setState({
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
      goToWaitingRoom: true,
    });
  });

  socket.on('room:host_transferred', ({ roomCode }: { roomCode: string }) => {
    // 방장이 나감 → 내가 새 방장으로 승격, 게임 상태 초기화
    useGameStore.setState({
      roomCode,
      isHost: true,
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
      goToWaitingRoom: true,
    });
    Toast.info('방장이 되었습니다.');
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
  clearRoundSubmit: () => set({ hasSubmittedRound: false }),
  clearError: () => set({ errorMessage: null }),
  clearGoToWaitingRoom: () => set({ goToWaitingRoom: false }),
  resetGameState: () => set((state) => ({ ...initialGameState, socket: state.socket })),
}));
