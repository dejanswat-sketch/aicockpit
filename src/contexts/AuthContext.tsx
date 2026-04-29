'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient, clearStaleAuthTokens } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Force-logout: wipe all storage and redirect to /login.
 * Called when a refresh_token_not_found error is detected to break
 * the rate-limit loop caused by repeated failed token refresh attempts.
 */
const forceLogout = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.clear();
    sessionStorage.clear();
    // Wipe sb-* and auth-token cookies
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0];
      if (name.startsWith('sb-') || name.includes('auth-token')) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
    });
  } catch {
    // storage may be unavailable
  }
  window.location.href = '/login';
};

/** Returns true if the error message indicates a stale/invalid refresh token. */
const isRefreshTokenError = (message?: string): boolean => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('refresh_token_not_found') ||
    lower.includes('invalid refresh token') ||
    lower.includes('token has expired') ||
    lower.includes('refresh token not found')
  );
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable client reference — never recreated during component lifetime
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let mounted = true;

    // Small debounce: give the browser a tick before Supabase attempts
    // automatic session refresh on load, reducing race conditions with
    // Web Locks and preventing immediate rate-limit hits.
    const initTimer = setTimeout(() => {
      if (!mounted) return;

      // onAuthStateChange fires INITIAL_SESSION synchronously on mount,
      // so no separate getSession() call is needed (avoids dual Web Lock acquisition).
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!mounted) return;

        switch (event) {
          case 'INITIAL_SESSION': case'SIGNED_IN': case'TOKEN_REFRESHED': case'USER_UPDATED':
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
            break;

          case 'TOKEN_REFRESH_FAILED':
            // Supabase fires this when the refresh token is invalid/not found.
            // Sign out locally first to stop the internal retry loop, then wipe
            // storage and redirect to /login.
            supabase.auth.signOut({ scope: 'local' }).finally(() => {
              forceLogout();
            });
            break;

          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setLoading(false);
            // Wipe any leftover sb-* / lock:* entries after sign-out
            clearStaleAuthTokens();
            // Redirect to login if not already there
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
            break;

          default:
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
        }
      });

      // Cleanup
      const cleanup = () => {
        mounted = false;
        subscription.unsubscribe();
      };

      // Store cleanup on the timer ref so the outer cleanup can call it
      (initTimer as any)._cleanup = cleanup;
    }, 100); // 100 ms debounce before first session refresh attempt

    return () => {
      mounted = false;
      clearTimeout(initTimer);
      // Call inner cleanup if it was registered
      if ((initTimer as any)._cleanup) {
        (initTimer as any)._cleanup();
      }
    };
    // supabase is a stable ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth methods ────────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    metadata: Record<string, unknown> = {}
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (metadata.fullName as string) ?? '',
          avatar_url: (metadata.avatarUrl as string) ?? '',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      if (isRefreshTokenError(error.message)) forceLogout();
      throw error;
    }
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (isRefreshTokenError(error.message)) forceLogout();
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getCurrentUser = async (): Promise<User | null> => {
    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (isRefreshTokenError(error.message)) forceLogout();
      throw error;
    }
    return currentUser;
  };

  const isEmailVerified = (): boolean => {
    return user?.email_confirmed_at != null;
  };

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  // ── Context value ───────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
