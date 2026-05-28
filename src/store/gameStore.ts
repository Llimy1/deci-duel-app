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
  | 'gameOver';

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
  countdown: number | null;
  currentRound: number;
  myScore: number;
  oppScore: number;
  roundResult: RoundRecord | null;
  roundResults: RoundRecord[];
  finalResult: NormalizedGameOver | null;
  disconnectedWaitSecs: number | null;
  errorMessage: string | null;
  hasSubmittedRound: boolean;
  connectSocket: (accessToken: string) => Socket | null;
  disconnectSocket: () => void;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  sendReady: () => void;
  submitRound: (round: number, peakDb: number) => void;
  clearRoundSubmit: () => void;
  clearError: () => void;
  resetGameState: () => void;
}

const initialGameState = {
  socket: null,
  status: 'idle' as GameStatus,
  roomCode: null,
  opponent: null,
  countdown: null,
  currentRound: 1,
  myScore: 0,
  oppScore: 0,
  roundResult: null,
  roundResults: [],
  finalResult: null,
  disconnectedWaitSecs: null,
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
    useGameStore.setState({ status: 'idle', errorMessage: null });
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
      status: 'waiting',
      opponent: null,
      countdown: null,
      roundResult: null,
      roundResults: [],
      finalResult: null,
      errorMessage: null,
    });
  });

  socket.on('room:joined', ({ roomCode, opponent }: { roomCode: string; opponent: ServerOpponent }) => {
    useGameStore.setState({
      roomCode,
      opponent: toOpponentInfo(opponent),
      status: 'matched',
      errorMessage: null,
    });
  });

  socket.on('opponent:joined', (opponent: ServerOpponent) => {
    useGameStore.setState({
      opponent: toOpponentInfo(opponent),
      status: 'matched',
      errorMessage: null,
    });
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
      hasSubmittedRound: false,
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

  socket.on('opponent:disconnected', ({ waitSecs }: { waitSecs: number }) => {
    useGameStore.setState({ disconnectedWaitSecs: waitSecs });
    Toast.info(`상대방 연결이 끊겼습니다. ${waitSecs}초 대기 중...`, 3000);
  });

  socket.on('opponent:reconnected', () => {
    useGameStore.setState({ disconnectedWaitSecs: null });
    Toast.success('상대방이 다시 연결되었습니다.');
  });

  socket.on('room:reconnected', ({ roomCode, currentRound }: { roomCode: string; state: string; currentRound: number }) => {
    useGameStore.setState({
      roomCode,
      currentRound,
      disconnectedWaitSecs: null,
    });
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
      errorMessage: null,
      hasSubmittedRound: false,
    });
    socket.emit('room:join', { roomCode: roomCode.toUpperCase() });
  },
  sendReady: () => {
    const { socket } = get();
    if (!socket?.connected) {
      Toast.error('게임 서버에 연결되지 않았습니다.');
      return;
    }
    set({ status: 'ready' });
    socket.emit('game:ready');
  },
  submitRound: (round, peakDb) => {
    const { socket, hasSubmittedRound } = get();
    if (!socket?.connected || hasSubmittedRound) return;
    set({ hasSubmittedRound: true });
    socket.emit('round:submit', { round, peakDb: Math.max(0, Math.min(200, peakDb)) });
  },
  clearRoundSubmit: () => set({ hasSubmittedRound: false }),
  clearError: () => set({ errorMessage: null }),
  resetGameState: () => set((state) => ({ ...initialGameState, socket: state.socket })),
}));
