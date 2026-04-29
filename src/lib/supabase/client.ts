import { createBrowserClient } from '@supabase/ssr';

// Clear all stale Supabase auth tokens from storage.
// Call this ONLY when you have confirmed there is an auth error
// (e.g. user explicitly signs out, or a hard reset is needed).
export const clearStaleAuthTokens = () => {
  if (typeof document === 'undefined') return;
  // Clear cookies
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    if (name.includes('auth-token') || name.startsWith('sb-')) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  });
  // Clear localStorage (tokens + any orphaned lock entries)
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') || k.includes('supabase') || k.startsWith('lock:'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
};

// Singleton client — prevents multiple instances from conflicting over cookies/tokens
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return clientInstance;
}
