export interface OpponentInfo {
  id: number;
  nickname: string;
  avatarColor: string;
  profileImageUrl: string | null;
  bestDb: number;
}

export interface RoundRecord {
  round: number;
  myDb: number;
  oppDb: number;
  result: 'win' | 'lose' | 'draw';
}

export const MOCK_OPPONENT: OpponentInfo = {
  id: 202605,
  nickname: '지민',
  avatarColor: '#00e5ff',
  profileImageUrl: null,
  bestDb: 124,
};

export function makeRoomCode() {
  const source = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => source[Math.floor(Math.random() * source.length)]).join('');
}
