import React from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950">
      <Sidebar activeRoute={activeRoute} />
      <main className="flex-1 overflow-auto bg-zinc-950 relative">
        {/* Subtle scan line overlay — z-index -1 ensures it never blocks clicks */}
        <div className="pointer-events-none fixed inset-0 scan-line opacity-30" style={{ zIndex: -1 }} />
        <div className="relative h-full">{children}</div>
      </main>
    </div>
  );
}