import React from 'react';
import AppLayout from '@/components/AppLayout';
import LaboratorijaContent from './components/LaboratorijaContent';

export default function LaboratorijaPage() {
  return (
    <AppLayout activeRoute="/laboratorija">
      <div className="h-full flex flex-col max-w-screen-2xl mx-auto">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-zinc-800">
          <div>
            <h1 className="text-xl font-600 text-zinc-100 tracking-tight">LABORATORIJA</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Private workspace — notes, tasks, and files</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-teal" />
            <span className="text-xs font-mono text-zinc-600">Private · Not synced</span>
          </div>
        </div>
        <LaboratorijaContent />
      </div>
    </AppLayout>
  );
}