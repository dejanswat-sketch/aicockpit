'use client';

import React from 'react';
import { ShieldOff } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 scan-line z-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md text-center">
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
        <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <ShieldOff size={28} className="text-red-400" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Access Denied</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This cockpit is a private environment. Your account is not authorised to access this
            application.
          </p>

          <div className="mt-6 pt-5 border-t border-zinc-800">
            <p className="text-xs text-zinc-600 font-mono">
              If you believe this is an error, contact the system administrator.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6 font-mono">
          AICockpit · Private · Restricted
        </p>
      </div>
    </div>
  );
}
