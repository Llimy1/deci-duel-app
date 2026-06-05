import { apiPost } from './client';

interface AuthTokenData {
  accessToken: string;
  refreshToken: string;
  user: { id: number; nickname: string };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokenData> {
  const response = await apiPost<AuthTokenData>('/auth/refresh', { refreshToken }, { skipAuth: true });
  return response.data;
}
