'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Send, Clock, XCircle, Eye, Calendar, Briefcase, FileText, ExternalLink, Plus, Loader2, AlertCircle, Search, Ghost, Trophy, X,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────

type ResponseStatus = 'pending' | 'viewed' | 'interview' | 'rejected' | 'offer' | 'ghosted';

interface Submission {
  id: string;
  cvName: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  responseStatus: ResponseStatus;
  submittedAt: string;
  submittedAtRaw: string;
  notes: string;
}

// ── Status Config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ResponseStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: 'text-zinc-400',    bg: 'bg-zinc-700/40 border-zinc-700',          icon: Clock },
  viewed:    { label: 'Viewed',    color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/20',       icon: Eye },
  interview: { label: 'Interview', color: 'text-teal-400',    bg: 'bg-teal-400/10 border-teal-400/20',       icon: Calendar },
  rejected:  { label: 'Rejected',  color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',         icon: XCircle },
  offer:     { label: 'Offer',     color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: Trophy },
  ghosted:   { label: 'Ghosted',   color: 'text-zinc-500',    bg: 'bg-zinc-800/60 border-zinc-700/50',       icon: Ghost },
};

const ALL_STATUSES: ResponseStatus[] = ['pending', 'viewed', 'interview', 'offer', 'rejected', 'ghosted'];

// ── Helpers ────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Supabase Service ───────────────────────────────────────────────────

async function fetchSubmissions(): Promise<Submission[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    cvName: row.cv_name,
    jobTitle: row.job_title,
    company: row.company,
    jobUrl: row.job_url || '',
    responseStatus: row.response_status as ResponseStatus,
    submittedAt: formatRelative(row.submitted_at),
    submittedAtRaw: formatTimestamp(row.submitted_at),
    notes: row.notes || '',
  }));
}

async function createSubmission(payload: {
  cvName: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  notes: string;
}): Promise<Submission> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      user_id: user.id,
      cv_name: payload.cvName,
      job_title: payload.jobTitle,
      company: payload.company,
      job_url: payload.jobUrl,
      notes: payload.notes,
      response_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    cvName: data.cv_name,
    jobTitle: data.job_title,
    company: data.company,
    jobUrl: data.job_url || '',
    responseStatus: data.response_status as ResponseStatus,
    submittedAt: formatRelative(data.submitted_at),
    submittedAtRaw: formatTimestamp(data.submitted_at),
    notes: data.notes || '',
  };
}

async function updateStatus(id: string, status: ResponseStatus): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('submissions')
    .update({ response_status: status })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

async function deleteSubmission(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ── Add Submission Modal ───────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  onAdd: (s: Submission) => void;
}

function AddSubmissionModal({ onClose, onAdd }: AddModalProps) {
  const [cvName, setCvName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !company.trim()) {
      toast.error('Job title and company are required');
      return;
    }
    setSaving(true);
    try {
      const created = await createSubmission({ cvName: cvName.trim(), jobTitle: jobTitle.trim(), company: company.trim(), jobUrl: jobUrl.trim(), notes: notes.trim() });
      onAdd(created);
      toast.success(`Submission to ${company.trim()} logged`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log submission');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Send size={15} className="text-teal-400" />
            <span className="text-sm font-600 text-zinc-100">Log New Submission</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">Job Title *</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Senior React Dev"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">Company *</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="FinCore Solutions"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">CV / Document Sent</label>
            <input
              value={cvName}
              onChange={(e) => setCvName(e.target.value)}
              placeholder="Marko_Novak_CV_2026.pdf"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">Job URL</label>
            <input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://upwork.com/jobs/..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key points, follow-up reminders..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-sm font-medium hover:text-zinc-200 hover:bg-zinc-700 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {saving ? 'Logging...' : 'Log Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function SubmissionsContent() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchSubmissions();
      setSubmissions(data);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: ResponseStatus) => {
    setUpdatingId(id);
    const prev = submissions.find((s) => s.id === id)?.responseStatus;
    setSubmissions((subs) => subs.map((s) => s.id === id ? { ...s, responseStatus: status } : s));
    try {
      await updateStatus(id, status);
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
    } catch (err: any) {
      if (prev) setSubmissions((subs) => subs.map((s) => s.id === id ? { ...s, responseStatus: prev } : s));
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, company: string) => {
    setSubmissions((subs) => subs.filter((s) => s.id !== id));
    try {
      await deleteSubmission(id);
      toast.success(`Submission to ${company} removed`);
    } catch {
      toast.error('Failed to delete submission');
      load();
    }
  };

  const filtered = submissions.filter((s) => {
    const matchSearch =
      search === '' ||
      s.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.cvName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.responseStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const total = submissions.length;
  const interviews = submissions.filter((s) => s.responseStatus === 'interview').length;
  const offers = submissions.filter((s) => s.responseStatus === 'offer').length;
  const pending = submissions.filter((s) => s.responseStatus === 'pending').length;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-teal-400 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm">Loading submissions...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <AlertCircle size={32} className="text-red-400 mb-4" />
        <p className="text-zinc-400 font-medium">Failed to load submissions</p>
        <p className="text-zinc-600 text-sm mt-1">{loadError}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Sent',  value: total,      icon: Send,         color: 'text-teal-400',    bg: 'bg-teal-400/10' },
          { label: 'Pending',     value: pending,    icon: Clock,        color: 'text-zinc-400',    bg: 'bg-zinc-700/40' },
          { label: 'Interviews',  value: interviews, icon: Calendar,     color: 'text-teal-400',    bg: 'bg-teal-400/10' },
          { label: 'Offers',      value: offers,     icon: Trophy,       color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        ].map((s) => {
          const StatIcon = s.icon;
          return (
            <div key={s.label} className="cockpit-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <StatIcon size={16} className={s.color} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono-data text-xl font-700 ${s.color}`}>{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job, company, CV..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === 'all' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            All
          </button>
          {ALL_STATUSES.map((st) => {
            const cfg = STATUS_CONFIG[st];
            const StatusIcon = cfg.icon;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === st ? `${cfg.bg} border ${cfg.color}` : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <StatusIcon size={11} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all ml-auto flex-shrink-0"
        >
          <Plus size={14} />
          Log Submission
        </button>
      </div>

      {/* Table */}
      <div className="cockpit-card flex-1 overflow-hidden flex flex-col">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.2fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-zinc-800 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          <span>Job / Company</span>
          <span>CV Sent</span>
          <span>Submitted</span>
          <span>Status</span>
          <span>Notes</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Send size={28} className="text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm font-medium">No submissions yet</p>
              <p className="text-zinc-700 text-xs mt-1">Log your first CV submission to start tracking</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
              >
                <Plus size={13} />
                Log Submission
              </button>
            </div>
          ) : (
            filtered.map((sub) => {
              const cfg = STATUS_CONFIG[sub.responseStatus];
              const StatusIcon = cfg.icon;
              return (
                <div key={sub.id} className="grid grid-cols-[2fr_1.5fr_1.5fr_1.2fr_1fr_auto] gap-4 px-4 py-3.5 items-start hover:bg-zinc-800/30 transition-colors group">
                  {/* Job / Company */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-zinc-200 truncate">{sub.jobTitle}</p>
                      {sub.jobUrl && (
                        <a href={sub.jobUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-teal-400 transition-colors flex-shrink-0">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      <Briefcase size={10} className="flex-shrink-0" />
                      {sub.company}
                    </p>
                  </div>

                  {/* CV Name */}
                  <div className="min-w-0">
                    {sub.cvName ? (
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-zinc-600 flex-shrink-0" />
                        <span className="text-xs text-zinc-400 truncate">{sub.cvName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </div>

                  {/* Submitted */}
                  <div>
                    <p className="text-xs text-zinc-400">{sub.submittedAt}</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5 font-mono">{sub.submittedAtRaw}</p>
                  </div>

                  {/* Status dropdown */}
                  <div>
                    <div className="relative">
                      <select
                        value={sub.responseStatus}
                        onChange={(e) => handleStatusChange(sub.id, e.target.value as ResponseStatus)}
                        disabled={updatingId === sub.id}
                        className={`appearance-none w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-all ${cfg.bg} ${cfg.color} disabled:opacity-50`}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-zinc-900 text-zinc-200">
                            {STATUS_CONFIG[st].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="min-w-0">
                    {sub.notes ? (
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{sub.notes}</p>
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleDelete(sub.id, sub.company)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSubmissionModal
          onClose={() => setShowAddModal(false)}
          onAdd={(s) => setSubmissions((prev) => [s, ...prev])}
        />
      )}
    </div>
  );
}
