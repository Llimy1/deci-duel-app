import { useAppStore } from '../store';
import { clearTokens, getTokens, saveTokens } from '../utils/secureStorage';
import { Toast } from '../utils/toast';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

interface AuthTokenData {
  accessToken: string;
  refreshToken: string;
  user: { id: number; nickname: string };
}

interface ApiOptions {
  skipAuth?: boolean;
  retryOnUnauthorized?: boolean;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

let refreshPromise: Promise<string> | null = null;
let expiryNotified = false;

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json?.message ?? `요청에 실패했습니다. (${response.status})`;
  } catch {
    return `요청에 실패했습니다. (${response.status})`;
  }
}

async function parseJson<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return await response.json();
  } catch {
    throw new Error('서버 응답을 처리하는 데 실패했습니다.');
  }
}

async function expireSession() {
  if (expiryNotified) return;
  expiryNotified = true;
  await clearTokens();
  useAppStore.getState().logout();
  Toast.info('세션이 만료되었습니다. 다시 로그인해주세요.', 4000);
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedTokens = await getTokens();
      const refreshToken = useAppStore.getState().refreshToken ?? storedTokens.refreshToken;

      if (!refreshToken) {
        throw new Error('refresh token missing');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const json = await parseJson<AuthTokenData>(response);
      await saveTokens(json.data.accessToken, json.data.refreshToken);
      useAppStore.getState().setTokens(json.data.accessToken, json.data.refreshToken, json.data.user.id);
      expiryNotified = false;
      return json.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const token = options.skipAuth ? null : useAppStore.getState().accessToken;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (e) {
    throw new Error(`네트워크 연결을 확인해주세요. (${e instanceof Error ? e.message : 'unknown'})`);
  }

  if (response.status === 401 && !options.skipAuth && retryOnUnauthorized) {
    try {
      const nextAccessToken = await refreshAccessToken();
      return request<T>(
        path,
        {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${nextAccessToken}`,
          },
        },
        { ...options, retryOnUnauthorized: false }
      );
    } catch (e) {
      await expireSession();
      throw e;
    }
  }

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return parseJson<T>(response);
}

export async function apiGet<T>(path: string, options?: ApiOptions): Promise<ApiResponse<T>> {
  return request<T>(path, {}, options);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: ApiOptions
): Promise<ApiResponse<T>> {
  const isFormData = body instanceof FormData;
  return request<T>(
    path,
    {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? body as BodyInit : JSON.stringify(body),
    },
    options
  );
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  options?: ApiOptions
): Promise<ApiResponse<T>> {
  return request<T>(
    path,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    options
  );
}

export async function apiDelete<T>(path: string, options?: ApiOptions): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'DELETE' }, options);
}
