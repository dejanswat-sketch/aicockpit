import React from 'react';
import AppLayout from '@/components/AppLayout';
import StatsBar from '@/components/StatsBar';
import RadarContent from './components/RadarContent';

export default function RadarPage() {
  return (
    <AppLayout activeRoute="/radar">
      <div className="h-full flex flex-col p-6 gap-5 max-w-screen-2xl mx-auto">
        {/* Stats */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-600 text-zinc-100 tracking-tight">RADAR</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Upwork job listings — scanning for opportunities</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-teal" />
              <span className="text-xs font-mono text-zinc-500">Live feed · Updated 4 min ago</span>
            </div>
          </div>
          <StatsBar />
        </div>
        {/* Listings */}
        <RadarContent />
      </div>
    </AppLayout>
  );
}