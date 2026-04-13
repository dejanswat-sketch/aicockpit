import React from 'react';
import AppLayout from '@/components/AppLayout';
import AIBrainContent from './components/AIBrainContent';

export default function AIBrainPage() {
  return (
    <AppLayout activeRoute="/ai-brain">
      <div className="h-full flex flex-col max-w-screen-2xl mx-auto">
        <AIBrainContent />
      </div>
    </AppLayout>
  );
}