import { apiPost } from './client';

export type OAuthProvider = 'apple' | 'google' | 'kakao';

interface AuthTokenData {
  accessToken: string;
  refreshToken: string;
  user: { id: number; nickname: string };
}

export interface OAuthExistingUserResponse extends AuthTokenData {
  isNewUser: false;
}

export interface OAuthNewUserResponse {
  isNewUser: true;
  signupToken: string;
  provider: OAuthProvider;
}

export type OAuthLoginResponse = OAuthExistingUserResponse | OAuthNewUserResponse;

export interface OAuthSignupResponse extends AuthTokenData {
  isNewUser: true;
}

export async function oauthLogin(
  provider: OAuthProvider,
  params: { idToken?: string; accessToken?: string },
): Promise<OAuthLoginResponse> {
  const res = await apiPost<OAuthLoginResponse>(
    '/auth/oauth',
    { provider, ...params },
    { skipAuth: true },
  );
  return res.data;
}

export async function exchangeAuthCode(code: string): Promise<OAuthLoginResponse> {
  const res = await apiPost<OAuthLoginResponse>(
    '/auth/oauth/exchange',
    { code },
    { skipAuth: true },
  );
  return res.data;
}

export async function completeOAuthSignup(
  signupToken: string,
  nickname: string,
  termsVersion: string,
  privacyVersion: string,
): Promise<OAuthSignupResponse> {
  const res = await apiPost<OAuthSignupResponse>(
    '/auth/oauth/signup',
    { signupToken, nickname, termsVersion, privacyVersion },
    { skipAuth: true },
  );
  return res.data;
}
