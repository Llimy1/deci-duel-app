import { apiGet } from './client';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  nickname: string;
  avatarColor: string;
  bestDb: number;
  profileImageUrl: string | null;
}

export interface GlobalLeaderboardResponse {
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
}

export async function getGlobalLeaderboard() {
  return apiGet<GlobalLeaderboardResponse>('/leaderboard/global');
}
