import { createBrowserClient } from '@supabase/ssr';

const PFX = 'sb_';

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    const k = '__sb_test__';
    document.cookie = `${k}=1; Path=/; SameSite=None; Secure; Partitioned`;
    cache = document.cookie.includes(k);
    document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=None; Secure`;
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined'
    ? []
    : document.cookie
        .split(';')
        .filter(Boolean)
        .map((c) => {
          const eqIdx = c.trim().indexOf('=');
          const name = eqIdx >= 0 ? c.trim().slice(0, eqIdx) : c.trim();
          const value = eqIdx >= 0 ? decodeURIComponent(c.trim().slice(eqIdx + 1)) : '';
          return { name: name.trim(), value };
        })
        .filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k.slice(PFX.length), value: localStorage.getItem(k) || '' }));
  } catch {
    return [];
  }
};

const setCookie = (name: string, value: string, options?: any) => {
  // Default to 1-year max-age for session persistence; override only if explicitly shorter
  const maxAge = options?.maxAge ?? 31536000; // 1 year in seconds
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=None; Secure; Partitioned; Max-Age=${maxAge}; Domain=nomorequiet.com`;
  if (options?.expires) s += `; Expires=${new Date(options.expires).toUTCString()}`;
  document.cookie = s;
};

const getToken = () =>
  (canUseCookies() ? fromCookies() : fromStorage()).find((c) =>
    c.name.includes('auth-token')
  )?.value ?? null;

// Clear all stale Supabase auth tokens from storage
export const clearStaleAuthTokens = () => {
  if (typeof document === 'undefined') return;
  // Clear cookies
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    if (name.includes('auth-token') || name.startsWith('sb-')) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`;
    }
  });
  // Clear localStorage
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX) || k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
};

if (typeof window !== 'undefined' && !(window as any).__sb_patched__) {
  (window as any).__sb_patched__ = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const token = getToken();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
      init = {
        ...(init || {}),
        headers: { ...(init?.headers || {}), 'x-sb-token': token },
      };
    }
    return orig(input, init);
  };
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'aicockpit-auth',
      },
      cookies: {
        getAll: () => (canUseCookies() ? fromCookies() : fromStorage()),
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          if (canUseCookies()) {
            cookiesToSet.forEach(({ name, value, options }) =>
              value
                ? setCookie(name, value, options)
                : (document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`)
            );
          } else {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                value
                  ? localStorage.setItem(`${PFX}${name}`, value)
                  : localStorage.removeItem(`${PFX}${name}`);
              } catch {}
              if (value) setCookie(name, value, options);
            });
          }
        },
      },
    }
  );
}
