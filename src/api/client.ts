export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

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

export async function apiGet<T>(path: string, token?: string): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e) {
    throw new Error(`네트워크 연결을 확인해주세요. (${e instanceof Error ? e.message : 'unknown'})`);
  }

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return parseJson<T>(response);
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`네트워크 연결을 확인해주세요. (${e instanceof Error ? e.message : 'unknown'})`);
  }

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return parseJson<T>(response);
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`네트워크 연결을 확인해주세요. (${e instanceof Error ? e.message : 'unknown'})`);
  }

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return parseJson<T>(response);
}

export async function apiDelete<T>(path: string, token?: string): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e) {
    throw new Error(`네트워크 연결을 확인해주세요. (${e instanceof Error ? e.message : 'unknown'})`);
  }

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return parseJson<T>(response);
}
