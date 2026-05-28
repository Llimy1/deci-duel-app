import type { OpponentInfo, RoundRecord } from '../types/game';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  DevSignup: undefined;
  Nickname: undefined;
  Photo: undefined;
  MicPermission: undefined;
  Welcome: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  SoloMeasure: { diaryMode?: boolean } | undefined;
  Countdown: undefined;
  Measure: undefined;
  RoundBreak: { round: number; meScore: number; oppScore: number };
  Result: undefined;
};

export type GameStackParamList = {
  DuelLobby: undefined;
  WaitingRoom: { roomCode: string };
  Matching: undefined;
  MatchFound: { roomCode?: string; opponent?: OpponentInfo } | undefined;
  Game: { roomCode?: string; opponent?: OpponentInfo } | undefined;
  GameResult: {
    result: 'win' | 'lose' | 'draw';
    myScore: number;
    oppScore: number;
    rounds: RoundRecord[];
    forfeit?: true;
  };
};

export type DiaryStackParamList = {
  Calendar: undefined;
  DayDetail: { date: string };
  SoloMeasure: { diaryMode?: boolean } | undefined;
};

export type RankingStackParamList = {
  Leaderboard: undefined;
  Friends: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Achievements: undefined;
  History: undefined;
  DailyChallenge: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  DiaryTab: NavigatorScreenParams<DiaryStackParamList> | undefined;
  RankingTab: NavigatorScreenParams<RankingStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type RootStackParamList =
  { MainTabs: NavigatorScreenParams<MainTabParamList> | undefined } &
  AuthStackParamList &
  HomeStackParamList &
  GameStackParamList &
  DiaryStackParamList &
  RankingStackParamList &
  ProfileStackParamList;
