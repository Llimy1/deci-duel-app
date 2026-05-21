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
  Matching: undefined;
  MatchFound: undefined;
  Countdown: undefined;
  Measure: undefined;
  RoundBreak: { round: number; meScore: number; oppScore: number };
  Result: undefined;
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
  Achievements: undefined;
  History: undefined;
  DailyChallenge: undefined;
};

export type RootStackParamList =
  AuthStackParamList &
  HomeStackParamList &
  DiaryStackParamList &
  RankingStackParamList &
  ProfileStackParamList;
