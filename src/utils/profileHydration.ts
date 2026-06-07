import { fetchMe, type Me } from '../api/me';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMeWithRetry(attempts = 2, delayMs = 700): Promise<Me> {
  let lastError: unknown;
  const maxAttempts = Math.max(1, attempts);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fetchMe();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await wait(delayMs);
      }
    }
  }

  throw lastError;
}
