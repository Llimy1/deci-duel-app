import { create } from 'zustand';
import type { Me } from '../api/me';

export interface MatchResult {
  mePeak: number;
  oppPeak: number;
  won: boolean;
}

export interface Opponent {
  name: string;
  bestDb: number;
}

export interface CurrentMatch {
  opponent: Opponent;
  round: number;
  meScore: number;
  oppScore: number;
}

interface UserState {
  id: number | null;
  name: string;
  avatarColor: string;
  profileImageUrl: string | null;
  streak: number;
  wins: number;
  losses: number;
  bestDb: number;
  createdAt: string | null;
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
  pendingOAuthSignup: { provider: 'apple' | 'google' | 'kakao'; signupToken: string } | null;
  setLastResult: (r: MatchResult) => void;
  updateBestDb: (db: number) => void;
  startMatch: (opponent: Opponent) => void;
  nextRound: (meWon: boolean) => void;
  clearMatch: () => void;
  setAuth: (nickname: string, color: string) => void;
  setTokens: (accessToken: string, refreshToken: string, userId: number) => void;
  restoreSession: (accessToken: string, refreshToken: string, userId: number, nickname: string) => void;
  setMe: (me: Me) => void;
  setNickname: (nickname: string) => void;
  setAvatarColor: (avatarColor: string) => void;
  setProfileImageUrl: (profileImageUrl: string | null) => void;
  setPendingOAuthSignup: (provider: 'apple' | 'google' | 'kakao', signupToken: string) => void;
  clearPendingOAuthSignup: () => void;
  logout: () => void;
}

const emptyUser: UserState = {
  id: null,
  name: '',
  avatarColor: '#ff2d87',
  profileImageUrl: null,
  streak: 0,
  wins: 0,
  losses: 0,
  bestDb: 0,
  createdAt: null,
};

export const useAppStore = create<AppState>((set) => ({
  user: emptyUser,
  lastResult: null,
  currentMatch: null,
  isLoggedIn: false,
  nickname: '',
  avatarColor: '#ff2d87',
  accessToken: null,
  refreshToken: null,
  userId: null,
  pendingOAuthSignup: null,
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
      user: {
        ...s.user,
        name: nickname,
        avatarColor: color,
      },
    })),
  setTokens: (accessToken, refreshToken, userId) =>
    set({ accessToken, refreshToken, userId }),
  restoreSession: (accessToken, refreshToken, userId, nickname) =>
    set((s) => ({
      isLoggedIn: true,
      accessToken,
      refreshToken,
      userId,
      nickname,
      user: {
        ...s.user,
        id: userId,
        name: nickname,
      },
    })),
  setMe: (me) =>
    set({
      isLoggedIn: true,
      userId: me.id,
      nickname: me.nickname,
      avatarColor: me.avatarColor,
      user: {
        id: me.id,
        name: me.nickname,
        avatarColor: me.avatarColor,
        profileImageUrl: me.profileImageUrl,
        streak: me.streak,
        wins: me.wins,
        losses: me.losses,
        bestDb: me.bestDb,
        createdAt: me.createdAt,
      },
    }),
  setNickname: (nickname) =>
    set((s) => ({
      nickname,
      user: { ...s.user, name: nickname },
    })),
  setAvatarColor: (avatarColor) =>
    set((s) => ({
      avatarColor,
      user: { ...s.user, avatarColor },
    })),
  setProfileImageUrl: (profileImageUrl) =>
    set((s) => ({
      user: { ...s.user, profileImageUrl },
    })),
  setPendingOAuthSignup: (provider, signupToken) =>
    set({ pendingOAuthSignup: { provider, signupToken } }),
  clearPendingOAuthSignup: () =>
    set({ pendingOAuthSignup: null }),
  logout: () =>
    set({
      isLoggedIn: false,
      nickname: '',
      avatarColor: '#ff2d87',
      accessToken: null,
      refreshToken: null,
      userId: null,
      user: emptyUser,
      currentMatch: null,
      lastResult: null,
      pendingOAuthSignup: null,
    }),
}));
