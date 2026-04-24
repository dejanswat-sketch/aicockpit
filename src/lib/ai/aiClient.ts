export async function callAIEndpoint(endpoint: string, payload: object, retries = 2) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Retry on 503 (service unavailable) or 429 (rate limit)
      if ((response.status === 503 || response.status === 429) && attempt < retries) {
        const delay = 1500 * Math.pow(2, attempt);
        console.warn(`AI service unavailable (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
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
        const delay = 1500 * Math.pow(2, attempt);
        console.warn(`Request error (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('API request error:', lastError);
  throw lastError;
}
