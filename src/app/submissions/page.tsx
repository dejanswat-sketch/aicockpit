import AppLayout from '@/components/AppLayout';
import SubmissionsContent from './components/SubmissionsContent';

export default function SubmissionsPage() {
  return (
    <AppLayout activeRoute="/submissions">
      <div className="flex flex-col h-full p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-700 text-zinc-100 tracking-tight">Submissions</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">CV submissions tracker — follow up, never miss a response</p>
          </div>
        </div>
        <SubmissionsContent />
      </div>
    </AppLayout>
  );
}
