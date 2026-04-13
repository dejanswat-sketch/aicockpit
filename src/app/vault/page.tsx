import React from 'react';
import AppLayout from '@/components/AppLayout';
import VaultContent from './components/VaultContent';

export default function VaultPage() {
  return (
    <AppLayout activeRoute="/vault">
      <div className="h-full flex flex-col p-6 gap-5 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-600 text-zinc-100 tracking-tight">VAULT</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Portfolio documents, CVs, and case studies</p>
          </div>
        </div>
        <VaultContent />
      </div>
    </AppLayout>
  );
}