'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.replace('/radar'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 scan-line z-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <AppLogo size={40} />
            <span className="font-sans font-bold text-2xl tracking-tight text-zinc-100">
              AICockpit
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-mono">Freelance Command Center</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-zinc-100 mb-1">Set new password</h1>
          <p className="text-sm text-zinc-500 mb-6">Enter your new password below</p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success ? (
            <div className="flex items-center gap-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg px-4 py-3">
              <CheckCircle size={16} className="text-teal-400 flex-shrink-0" />
              <p className="text-sm text-teal-400">Password updated! Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
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

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/50 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm py-2.5 rounded-lg transition-colors mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <Lock size={15} />
                )}
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6 font-mono">
          AICockpit · Secure · Encrypted
        </p>
      </div>
    </div>
  );
}
