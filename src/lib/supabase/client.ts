import { createBrowserClient } from '@supabase/ssr';

/**
 * Clears all Supabase auth tokens and orphaned lock entries from localStorage and cookies.
 * Safe to call at any time — removes only sb-* and lock:* keys.
 */
export const clearStaleAuthTokens = () => {
  if (typeof window === 'undefined') return;

  // Clear cookies
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    if (name.startsWith('sb-') || name.includes('auth-token')) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  });

  // Clear localStorage: all sb-* keys and all lock:* keys
  try {
    const keysToRemove = Object.keys(localStorage).filter(
      (k) => k.startsWith('sb-') || k.startsWith('lock:')
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage may be unavailable in some environments
  }
};

// Singleton client — one instance per browser session
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return clientInstance;
}

/**
 * Destroys the singleton and wipes all auth storage.
 * Use this for a full hard reset when lock errors occur.
 */
export function resetClient() {
  clientInstance = null;
  clearStaleAuthTokens();
}
