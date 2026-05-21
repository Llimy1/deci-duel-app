import { apiPost } from './client';

interface AuthTokenData {
  accessToken: string;
  refreshToken: string;
  user: { id: number; nickname: string };
}

export async function devSignup(id: string, password: string, nickname: string): Promise<AuthTokenData> {
  const response = await apiPost<AuthTokenData>('/auth/dev/signup', { id, password, nickname });
  return response.data;
}

export async function devLogin(id: string, password: string): Promise<AuthTokenData> {
  const response = await apiPost<AuthTokenData>('/auth/dev/login', { id, password });
  return response.data;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokenData> {
  const response = await apiPost<AuthTokenData>('/auth/refresh', { refreshToken });
  return response.data;
}
