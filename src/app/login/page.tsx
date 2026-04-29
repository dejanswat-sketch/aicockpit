'use client';

import React, { useState, useEffect, Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldAlert } from 'lucide-react';
import { createClient, clearStaleAuthTokens } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Emergency Reset state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [resetEmail] = useState('dejanswat@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    // Proactively clear any stale/corrupt tokens on login page load
    // This resolves "Invalid Refresh Token: Refresh Token Not Found" errors
    // that prevent the lock from being acquired and block sign-in
    clearStaleAuthTokens();

    // Check both searchParams and raw window.location.search for reliability
    const fromSearchParams = searchParams.get('admin') === 'true';
    const fromWindowSearch =
      typeof window !== 'undefined' && window.location.search.includes('admin=true');
    setIsAdminMode(fromSearchParams || fromWindowSearch);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/radar');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setResetLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setResetMessage('✅ Password updated successfully. You can now sign in.');
      setNewPassword('');
    } catch (err: any) {
      try {
        const supabase = createClient();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.nomorequiet.com';
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${siteUrl}/auth/callback?type=recovery`,
        });
        if (resetError) throw resetError;
        setResetMessage('📧 Reset email sent to ' + resetEmail + '. Check your inbox.');
      } catch (fallbackErr: any) {
        setResetMessage('❌ Error: ' + (fallbackErr?.message || 'Failed to reset password'));
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Subtle scan line overlay */}
      <div className="pointer-events-none fixed inset-0 scan-line z-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <AppLogo size={40} />
            <span className="font-sans font-bold text-2xl tracking-tight text-zinc-100">
              AICockpit
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-mono">Freelance Command Center</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-zinc-100 mb-1">Welcome back</h1>
          <p className="text-sm text-zinc-500 mb-6">Sign in to your cockpit</p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  suppressHydrationWarning
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  suppressHydrationWarning
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/50 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm py-2.5 rounded-lg transition-colors mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* "Create account" link removed — private app, no public sign-ups */}
        </div>

        {/* Emergency Reset Panel — visible ONLY when ?admin=true is in URL */}
        {isAdminMode && (
          <div className="mt-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                Emergency Reset
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mb-4 font-mono">
              Target: <span className="text-amber-300">{resetEmail}</span>
            </p>

            {resetMessage && (
              <div className="text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 mb-4 font-mono">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleEmergencyReset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={resetLoading || !newPassword}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/40 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm py-2.5 rounded-lg transition-colors"
              >
                {resetLoading ? (
                  <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <ShieldAlert size={15} />
                )}
                {resetLoading ? 'Processing…' : 'Set Password / Send Reset Email'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-zinc-700 mt-6 font-mono">
          AICockpit · Secure · Encrypted
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LoginContent />
    </Suspense>
  );
}
