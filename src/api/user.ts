import { apiGet } from './client';

interface NicknameCheckData {
  available: boolean;
}

export async function checkNicknameAvailability(nickname: string): Promise<boolean> {
  const query = encodeURIComponent(nickname);
  const response = await apiGet<NicknameCheckData>(`/user/nickname/check?nickname=${query}`, { skipAuth: true });

  return response.data.available;
}
