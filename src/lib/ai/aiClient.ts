export async function callAIEndpoint(endpoint: string, payload: object, retries = 4) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Check both HTTP status and body statusCode for 503/429 (service unavailable / rate limit)
      const isRetryableStatus =
        response.status === 503 ||
        response.status === 429 ||
        data?.statusCode === 503 ||
        data?.statusCode === 429;

      if (isRetryableStatus && attempt < retries) {
        const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
        console.warn(
          `AI service unavailable (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
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
        const delay = 2000 * Math.pow(2, attempt);
        console.warn(
          `Request error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('API request error:', lastError);
  throw lastError;
}
