import { create } from 'zustand';

export interface MatchResult {
  mePeak: number;
  oppPeak: number;
  won: boolean;
}

export interface Opponent {
  name: string;
  level: number;
  bestDb: number;
}

export interface CurrentMatch {
  opponent: Opponent;
  round: number;
  meScore: number;
  oppScore: number;
}

interface UserState {
  name: string;
  level: number;
  streak: number;
  bestDb: number;
  xp: number;
}

interface AppState {
  user: UserState;
  lastResult: MatchResult | null;
  currentMatch: CurrentMatch | null;
  isLoggedIn: boolean;
  nickname: string;
  avatarColor: string;
  accessToken: string | null;
  refreshToken: string | null;
  userId: number | null;
  pendingDevCredentials: { devId: string; devPw: string } | null;
  setLastResult: (r: MatchResult) => void;
  updateBestDb: (db: number) => void;
  startMatch: (opponent: Opponent) => void;
  nextRound: (meWon: boolean) => void;
  clearMatch: () => void;
  setAuth: (nickname: string, color: string) => void;
  setTokens: (accessToken: string, refreshToken: string, userId: number) => void;
  restoreSession: (accessToken: string, refreshToken: string, userId: number, nickname: string) => void;
  setPendingDevCredentials: (devId: string, devPw: string) => void;
  clearPendingDevCredentials: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    name: '재민',
    level: 7,
    streak: 3,
    bestDb: 118,
    xp: 2340,
  },
  lastResult: null,
  currentMatch: null,
  isLoggedIn: false,
  nickname: '재민',
  avatarColor: '#ff2d87',
  accessToken: null,
  refreshToken: null,
  userId: null,
  pendingDevCredentials: null,
  setLastResult: (r) => set({ lastResult: r }),
  startMatch: (opponent) =>
    set({ currentMatch: { opponent, round: 1, meScore: 0, oppScore: 0 } }),
  nextRound: (meWon) =>
    set((s) => s.currentMatch ? {
      currentMatch: {
        ...s.currentMatch,
        round: s.currentMatch.round + 1,
        meScore: s.currentMatch.meScore + (meWon ? 1 : 0),
        oppScore: s.currentMatch.oppScore + (meWon ? 0 : 1),
      },
    } : {}),
  clearMatch: () => set({ currentMatch: null }),
  updateBestDb: (db) =>
    set((s) => ({
      user: { ...s.user, bestDb: Math.max(s.user.bestDb, db) },
    })),
  setAuth: (nickname, color) =>
    set((s) => ({
      isLoggedIn: true,
      nickname,
      avatarColor: color,
      user: { ...s.user, name: nickname },
    })),
  setTokens: (accessToken, refreshToken, userId) =>
    set({ accessToken, refreshToken, userId }),
  restoreSession: (accessToken, refreshToken, userId, nickname) =>
    set({
      isLoggedIn: true,
      accessToken,
      refreshToken,
      userId,
      nickname,
      user: { name: nickname, level: 1, streak: 0, bestDb: 0, xp: 0 },
    }),
  setPendingDevCredentials: (devId, devPw) =>
    set({ pendingDevCredentials: { devId, devPw } }),
  clearPendingDevCredentials: () =>
    set({ pendingDevCredentials: null }),
  logout: () =>
    set({
      isLoggedIn: false,
      nickname: '재민',
      avatarColor: '#ff2d87',
      accessToken: null,
      refreshToken: null,
      userId: null,
    }),
}));
