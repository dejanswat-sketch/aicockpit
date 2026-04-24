const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callAIEndpoint(endpoint: string, payload: object, retries = MAX_RETRIES) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Detect 503 (Service Unavailable) from HTTP status or response body
      const is503 =
        response.status === 503 ||
        data?.statusCode === 503;

      if (is503 && attempt < retries) {
        console.warn(
          `Gemini API returned 503 (attempt ${attempt + 1}/${retries + 1}), retrying in ${RETRY_DELAY_MS}ms...`
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      // Detect 429 (Rate Limit) — also retry with 2s delay
      const is429 =
        response.status === 429 ||
        data?.statusCode === 429;

      if (is429 && attempt < retries) {
        console.warn(
          `Gemini API rate limited (attempt ${attempt + 1}/${retries + 1}), retrying in ${RETRY_DELAY_MS}ms...`
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (!response.ok || data.error) {
        console.error('API Route Error:', {
          error: data.error,
          details: data.details,
        });
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        console.warn(
          `Network error (attempt ${attempt + 1}/${retries + 1}), retrying in ${RETRY_DELAY_MS}ms...`
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  console.error('All retry attempts exhausted:', lastError);
  throw lastError;
}
