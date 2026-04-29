'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Brain,
  Star,
  Clock,
  DollarSign,
  Users,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Circle,
  Send,
  Zap,
  Loader2,
  Radio,
  Rss,
  ClipboardPaste,
  X,
  RefreshCw,
  FileDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { jobListingsService, type JobListing } from '@/lib/services/cockpitService';

const STATUS_CONFIG: Record<JobListing['status'], { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'New', color: 'bg-teal-400/15 text-teal-400 border-teal-400/20', icon: Zap },
  reviewed: { label: 'Reviewed', color: 'bg-blue-400/15 text-blue-400 border-blue-400/20', icon: Circle },
  'proposal-sent': { label: 'Proposal Sent', color: 'bg-amber-400/15 text-amber-400 border-amber-400/20', icon: Send },
  shortlisted: { label: 'Shortlisted', color: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20', icon: CheckCircle2 },
  archived: { label: 'Archived', color: 'bg-zinc-700/50 text-zinc-500 border-zinc-700', icon: AlertCircle },
};

const MATCH_COLOR = (score: number) => {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-teal-400';
  if (score >= 55) return 'text-amber-400';
  return 'text-red-400';
};

const MATCH_BG = (score: number) => {
  if (score >= 85) return 'bg-emerald-400/10';
  if (score >= 70) return 'bg-teal-400/10';
  if (score >= 55) return 'bg-amber-400/10';
  return 'bg-red-400/10';
};

const WWR_RSS_URL = 'https://weworkremotely.com/remote-jobs.rss';
const WWR_PROXY = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(WWR_RSS_URL)}&count=20`;

interface RSSItem {
  id: string;
  title: string;
  company: string;
  link: string;
  pubDate: string;
  description: string;
  category: string;
  score: number;
}

interface AddJobForm {
  title: string;
  client: string;
  budget: string;
  budgetType: 'fixed' | 'hourly';
  skills: string;
  description: string;
  category: string;
  matchScore: string;
}

const EMPTY_FORM: AddJobForm = {
  title: '',
  client: '',
  budget: '',
  budgetType: 'fixed',
  skills: '',
  description: '',
  category: '',
  matchScore: '',
};

function scoreRSSItem(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  const keywords = ['node', 'nodejs', 'node.js', 'react', 'typescript', 'supabase', 'stripe', 'android', 'mobile', 'backend', 'fullstack', 'full-stack', 'api', 'architect'];
  let score = 50;
  keywords.forEach((kw) => { if (text.includes(kw)) score += 5; });
  return Math.min(score, 99);
}

function parseRSSItems(items: any[]): RSSItem[] {
  return items.map((item, i) => {
    const titleParts = (item.title || '').split(' at ');
    const jobTitle = titleParts[0]?.trim() || item.title || 'Remote Job';
    const company = titleParts[1]?.trim() || 'We Work Remotely';
    let score = scoreRSSItem(item.title || '', item.description || '');
    return {
      id: `wwr-${i}-${Date.now()}`,
      title: jobTitle,
      company,
      link: item.link || '#',
      pubDate: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
      description: (item.description || '').replace(/<[^>]*>/g, '').slice(0, 200),
      category: item.categories?.[0] || 'Remote',
      score,
    };
  });
}

async function fetchWWRFeed(): Promise<RSSItem[]> {
  const res = await fetch(WWR_PROXY);
  if (!res.ok) throw new Error('Failed to fetch RSS feed');
  const data = await res.json();
  if (data.status !== 'ok') throw new Error('RSS feed error');
  return parseRSSItems(data.items || []);
}

async function scoreJobWithGemini(jobText: string, retries = 3): Promise<{ score: number; keywords: string[]; summary: string }> {
  const prompt = `Analyze this job listing for a Node.js/Android/Supabase/Stripe developer and return JSON only:
{
  "score": <number 1-10>,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "summary": "1-2 sentence match summary"
}

Job listing:
${jobText.slice(0, 2000)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'GEMINI',
          model: 'gemini/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 512,
          stream: false,
        }),
      });
      if (res.status === 503 || res.status === 429) {
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 1500 * attempt)); continue; }
        throw new Error('Gemini unavailable');
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const content = data.content || data.message || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { score: 5, keywords: [], summary: 'Analysis complete' };
    } catch (err: any) {
      if (attempt === retries) return { score: 5, keywords: [], summary: err.message };
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return { score: 5, keywords: [], summary: 'Analysis failed' };
}

interface QuickPasteResult {
  score: number;
  keywords: string[];
  summary: string;
}

export default function RadarContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RSS state
  const [rssItems, setRssItems] = useState<RSSItem[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [rssLastFetched, setRssLastFetched] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<'saved' | 'wwr'>('saved');

  // Quick Paste state
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteSource, setPasteSource] = useState<'linkedin' | 'wellfound'>('linkedin');
  const [pasteAnalyzing, setPasteAnalyzing] = useState(false);
  const [pasteResult, setPasteResult] = useState<QuickPasteResult | null>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  // Add Job modal state
  const [showAddJob, setShowAddJob] = useState(false);
  const [addJobForm, setAddJobForm] = useState<AddJobForm>(EMPTY_FORM);
  const [addJobLoading, setAddJobLoading] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobListingsService.getAll();
      setListings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load job listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const loadRSSFeed = useCallback(async () => {
    setRssLoading(true);
    setRssError(null);
    try {
      const items = await fetchWWRFeed();
      setRssItems(items);
      setRssLastFetched(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
      toast.success(`Loaded ${items.length} jobs from We Work Remotely`);
    } catch (err: any) {
      setRssError(err.message || 'Failed to load RSS feed');
      toast.error('Failed to fetch We Work Remotely feed');
    } finally {
      setRssLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSource === 'wwr' && rssItems.length === 0) {
      loadRSSFeed();
    }
  }, [activeSource, rssItems.length, loadRSSFeed]);

  const analyzeQuickPaste = async () => {
    if (!pasteText.trim()) return;
    setPasteAnalyzing(true);
    setPasteResult(null);
    try {
      const result = await scoreJobWithGemini(pasteText);
      setPasteResult(result);
    } catch (err: any) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setPasteAnalyzing(false);
    }
  };

  const sendPasteToAIBrain = () => {
    if (!pasteText.trim()) return;
    toast.success('Job text sent to AI BRAIN for full analysis', {
      action: { label: 'Open', onClick: () => window.location.href = '/ai-brain' },
    });
  };

  const sendPasteToCV = () => {
    if (!pasteText.trim()) return;
    window.location.href = '/vault';
    toast.success('Opening CV Generator with job context...');
  };

  const handleAddJob = async () => {
    if (!addJobForm.title.trim() || !addJobForm.client.trim() || !addJobForm.budget.trim()) {
      toast.error('Title, client, and budget are required');
      return;
    }
    setAddJobLoading(true);
    try {
      const skills = addJobForm.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const newJob = await jobListingsService.create({
        title: addJobForm.title.trim(),
        client: addJobForm.client.trim(),
        budget: addJobForm.budget.trim(),
        budgetType: addJobForm.budgetType,
        skills,
        description: addJobForm.description.trim(),
        category: addJobForm.category.trim(),
        matchScore: addJobForm.matchScore ? parseInt(addJobForm.matchScore, 10) : 0,
      });
      if (newJob) {
        setListings((prev) => [newJob, ...prev]);
        toast.success('Job listing added');
        setShowAddJob(false);
        setAddJobForm(EMPTY_FORM);
      } else {
        toast.error('Failed to add job listing');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add job listing');
    } finally {
      setAddJobLoading(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    setDeletingId(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
    try {
      await jobListingsService.delete(id);
      toast.success('Job listing removed');
    } catch (err: any) {
      toast.error('Failed to delete listing');
      loadListings();
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchSearch =
        search === '' ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.skills.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        l.client.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchFavorites = !favoritesOnly || l.saved;
      return matchSearch && matchStatus && matchFavorites;
    });
  }, [listings, search, statusFilter, favoritesOnly]);

  const filteredRSS = useMemo(() => {
    if (!search) return rssItems;
    return rssItems.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.company.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [rssItems, search]);

  const toggleSave = async (id: string) => {
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;
    const newSaved = !listing.saved;
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, saved: newSaved } : l)));
    try {
      await jobListingsService.toggleSave(id, newSaved);
    } catch {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, saved: !newSaved } : l)));
      toast.error('Failed to update saved status');
    }
  };

  const sendToAIBrain = (listing: JobListing) => {
    toast.success(`"${listing.title}" sent to AI BRAIN for analysis`, {
      description: 'Open AI BRAIN to start the analysis session.',
      action: { label: 'Open', onClick: () => window.location.href = '/ai-brain' },
    });
  };

  const updateStatus = async (id: string, status: JobListing['status']) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await jobListingsService.updateStatus(id, status);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
      loadListings();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-teal-400 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm">Loading job listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <AlertCircle size={32} className="text-red-400 mb-4" />
        <p className="text-zinc-400 font-medium">Failed to load listings</p>
        <p className="text-zinc-600 text-sm mt-1">{error}</p>
        <button
          onClick={loadListings}
          className="mt-4 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Add Job Modal */}
      {showAddJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col gap-0 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Plus size={15} className="text-teal-400" />
                <span className="text-sm font-600 text-zinc-100">Add Job Listing</span>
              </div>
              <button
                onClick={() => { setShowAddJob(false); setAddJobForm(EMPTY_FORM); }}
                className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Job Title *</label>
                  <input
                    type="text"
                    value={addJobForm.title}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Senior React Developer"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Client / Company *</label>
                  <input
                    type="text"
                    value={addJobForm.client}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, client: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Category</label>
                  <input
                    type="text"
                    value={addJobForm.category}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Frontend"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Budget *</label>
                  <input
                    type="text"
                    value={addJobForm.budget}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="e.g. $3,000-$5,000 or $50/hr"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Budget Type</label>
                  <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                    {(['fixed', 'hourly'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAddJobForm((f) => ({ ...f, budgetType: t }))}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                          addJobForm.budgetType === t ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Match Score (0-99)</label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={addJobForm.matchScore}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, matchScore: e.target.value }))}
                    placeholder="e.g. 85"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={addJobForm.skills}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. React, TypeScript, Node.js"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Description</label>
                  <textarea
                    value={addJobForm.description}
                    onChange={(e) => setAddJobForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Paste job description or add notes..."
                    rows={4}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 resize-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={() => { setShowAddJob(false); setAddJobForm(EMPTY_FORM); }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddJob}
                disabled={addJobLoading}
                className="flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addJobLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {addJobLoading ? 'Adding...' : 'Add Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source switcher + Quick Paste toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button
            onClick={() => setActiveSource('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeSource === 'saved' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Radio size={13} />
            Saved Listings
            <span className="font-mono text-[9px] text-zinc-600">{listings.length}</span>
          </button>
          <button
            onClick={() => setActiveSource('wwr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeSource === 'wwr' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Rss size={13} className={activeSource === 'wwr' ? 'text-orange-400' : ''} />
            We Work Remotely
            {rssLastFetched && (
              <span className="text-[9px] text-zinc-600 font-mono">{rssLastFetched}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSource === 'wwr' && (
            <button
              onClick={loadRSSFeed}
              disabled={rssLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg text-xs font-medium hover:border-zinc-700 hover:text-zinc-300 transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={rssLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
          {activeSource === 'saved' && (
            <button
              onClick={() => setShowAddJob(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-lg text-xs font-medium hover:bg-teal-400/20 transition-all"
            >
              <Plus size={13} />
              Add Job
            </button>
          )}
          <button
            onClick={() => { setShowQuickPaste(!showQuickPaste); setPasteResult(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
              showQuickPaste
                ? 'bg-violet-400/10 border-violet-400/30 text-violet-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <ClipboardPaste size={13} />
            Quick Paste
          </button>
        </div>
      </div>

      {/* Quick Paste Panel */}
      {showQuickPaste && (
        <div className="cockpit-card p-4 flex flex-col gap-3 border-violet-400/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardPaste size={14} className="text-violet-400" />
              <span className="text-sm font-600 text-zinc-200">Quick Paste — Job Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                {(['linkedin', 'wellfound'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setPasteSource(src)}
                    className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all capitalize ${
                      pasteSource === src ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {src === 'linkedin' ? 'LinkedIn' : 'Wellfound'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowQuickPaste(false); setPasteText(''); setPasteResult(null); }}
                className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          <textarea
            ref={pasteRef}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste ${pasteSource === 'linkedin' ? 'LinkedIn' : 'Wellfound'} job description here...`}
            rows={6}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/40 resize-none font-mono leading-relaxed transition-all"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-zinc-600">
              {pasteText.length > 0 ? `${pasteText.length} characters` : 'Paste job text to analyze with AI Scoring'}
            </p>
            <div className="flex items-center gap-2">
              {pasteText.trim() && (
                <>
                  <button
                    onClick={sendPasteToAIBrain}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-[10px] font-medium hover:border-zinc-600 transition-all"
                  >
                    <Brain size={11} />
                    AI BRAIN
                  </button>
                  <button
                    onClick={sendPasteToCV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-[10px] font-medium hover:border-zinc-600 transition-all"
                  >
                    <FileDown size={11} />
                    CV Engine
                  </button>
                </>
              )}
              <button
                onClick={analyzeQuickPaste}
                disabled={!pasteText.trim() || pasteAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-400/10 border border-violet-400/30 text-violet-400 rounded-lg text-[10px] font-medium hover:bg-violet-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pasteAnalyzing ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {pasteAnalyzing ? 'Scoring...' : 'Score & Analyze'}
              </button>
            </div>
          </div>

          {/* Paste result */}
          {pasteResult && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">AI Scoring Result</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-700 font-mono ${
                  pasteResult.score >= 8 ? 'bg-emerald-400/15 text-emerald-400' :
                  pasteResult.score >= 6 ? 'bg-teal-400/15 text-teal-400' :
                  pasteResult.score >= 4 ? 'bg-amber-400/15 text-amber-400': 'bg-red-400/15 text-red-400'
                }`}>
                  <Star size={10} className="fill-current" />
                  {pasteResult.score}/10
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-2">{pasteResult.summary}</p>
              {pasteResult.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wide self-center">Keywords:</span>
                  {pasteResult.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] rounded font-medium">{kw}</span>
                  ))}
                </div>
              )}
              {pasteResult.score >= 8 && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <CheckCircle2 size={11} />
                  High match — recommend generating CV and proposal
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder={activeSource === 'wwr' ? 'Search We Work Remotely jobs...' : 'Search listings, skills, clients...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all"
          />
        </div>

        {activeSource === 'saved' && (
          <>
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              title="Show favorites only"
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 ${
                favoritesOnly
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' :'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <Bookmark size={14} className={favoritesOnly ? 'fill-amber-400' : ''} />
              Favorites
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 ${showFilters ? 'bg-teal-400/10 border-teal-400/30 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}
            >
              <Filter size={14} />
              Filters
              <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-xs font-mono text-zinc-600 ml-auto">
              {filtered.length} of {listings.length} listings
            </span>
          </>
        )}

        {activeSource === 'wwr' && (
          <span className="text-xs font-mono text-zinc-600 ml-auto">
            {filteredRSS.length} jobs
          </span>
        )}
      </div>

      {/* Filter chips (saved only) */}
      {activeSource === 'saved' && showFilters && (
        <div className="flex items-center gap-2 flex-wrap animate-fade-in">
          {(['all', 'new', 'reviewed', 'proposal-sent', 'shortlisted', 'archived'] as const).map((s) => (
            <button
              key={`filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${statusFilter === s ? 'bg-teal-400/15 border-teal-400/30 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
            >
              {s === 'all' ? 'All Listings' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}

      {/* We Work Remotely RSS Feed */}
      {activeSource === 'wwr' && (
        <>
          {rssLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="text-orange-400 animate-spin mr-3" />
              <p className="text-zinc-500 text-sm">Fetching We Work Remotely jobs...</p>
            </div>
          )}
          {rssError && !rssLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle size={32} className="text-red-400 mb-3" />
              <p className="text-zinc-400 font-medium text-sm">Failed to load RSS feed</p>
              <p className="text-zinc-600 text-xs mt-1">{rssError}</p>
              <button onClick={loadRSSFeed} className="mt-3 px-4 py-2 bg-orange-400/10 border border-orange-400/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-400/20 transition-all">
                Retry
              </button>
            </div>
          )}
          {!rssLoading && !rssError && filteredRSS.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Rss size={40} className="text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">No jobs found</p>
              <button onClick={loadRSSFeed} className="mt-3 px-4 py-2 bg-orange-400/10 border border-orange-400/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-400/20 transition-all">
                Load Feed
              </button>
            </div>
          )}
          {!rssLoading && filteredRSS.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 pb-6">
              {filteredRSS.map((item) => (
                <div key={item.id} className="cockpit-card cockpit-card-hover p-4 flex flex-col gap-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border bg-orange-400/10 text-orange-400 border-orange-400/20">
                          <Rss size={8} />
                          WWR
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600">{item.category}</span>
                      </div>
                      <h3 className="text-sm font-600 text-zinc-100 leading-snug line-clamp-2">{item.title}</h3>
                    </div>
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${MATCH_BG(item.score)} flex flex-col items-center justify-center`}>
                      <span className={`font-mono-data text-base font-700 leading-none ${MATCH_COLOR(item.score)}`}>{item.score}</span>
                      <span className="text-[8px] text-zinc-600 font-mono mt-0.5">SCORE</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="text-zinc-400 font-medium">{item.company}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {item.pubDate}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-600">We Work Remotely</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setPasteText(`${item.title}\n${item.company}\n\n${item.description}`);
                          setShowQuickPaste(true);
                          setPasteResult(null);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 bg-violet-400/10 border border-violet-400/20 text-violet-400 rounded-md text-[10px] font-medium hover:bg-violet-400/20 transition-all"
                      >
                        <ClipboardPaste size={10} />
                        Analyze
                      </button>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Saved listings grid */}
      {activeSource === 'saved' && (
        <>
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Radio size={40} className="text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">
                {listings.length === 0 ? 'No job listings yet' : 'No listings match your search'}
              </p>
              <p className="text-zinc-600 text-sm mt-1">
                {listings.length === 0 ? 'Add your first job listing to get started' : 'Try adjusting your search or filters'}
              </p>
              {listings.length === 0 ? (
                <button
                  onClick={() => setShowAddJob(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
                >
                  <Plus size={14} />
                  Add First Job
                </button>
              ) : (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); setFavoritesOnly(false); }}
                  className="mt-4 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 pb-6">
              {filtered.map((listing) => {
                const StatusIcon = STATUS_CONFIG[listing.status].icon;
                return (
                  <div
                    key={listing.id}
                    className="cockpit-card cockpit-card-hover p-4 flex flex-col gap-3 animate-slide-up group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${STATUS_CONFIG[listing.status].color}`}>
                            <StatusIcon size={9} />
                            {STATUS_CONFIG[listing.status].label}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600">{listing.category}</span>
                        </div>
                        <h3 className="text-sm font-600 text-zinc-100 leading-snug line-clamp-2">
                          {listing.title}
                        </h3>
                      </div>
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${MATCH_BG(listing.matchScore)} flex flex-col items-center justify-center`}>
                        <span className={`font-mono-data text-base font-700 leading-none ${MATCH_COLOR(listing.matchScore)}`}>
                          {listing.matchScore}
                        </span>
                        <span className="text-[8px] text-zinc-600 font-mono mt-0.5">MATCH</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="text-zinc-400 font-medium">{listing.client}</span>
                      <span className="flex items-center gap-0.5">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="font-mono">{listing.clientRating}</span>
                      </span>
                      <span className="font-mono text-zinc-600">{listing.clientSpend} spent</span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {listing.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {listing.skills.slice(0, 4).map((skill) => (
                        <span
                          key={`${listing.id}-skill-${skill}`}
                          className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-medium rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                      {listing.skills.length > 4 && (
                        <span className="px-2 py-0.5 bg-zinc-800/50 text-zinc-600 text-[10px] rounded-md">
                          +{listing.skills.length - 4}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                      <div className="flex items-center gap-3 text-xs text-zinc-600">
                        <span className="flex items-center gap-1">
                          <DollarSign size={10} className="text-zinc-500" />
                          <span className="font-mono-data text-zinc-400">{listing.budget}</span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-600 capitalize">{listing.budgetType}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          <span className="font-mono">{listing.proposals} proposals</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {listing.posted}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => toggleSave(listing.id)}
                          title={listing.saved ? 'Remove from favorites' : 'Add to favorites'}
                          className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-amber-400 transition-all"
                        >
                          {listing.saved ? (
                            <BookmarkCheck size={13} className="text-amber-400" />
                          ) : (
                            <Bookmark size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => sendToAIBrain(listing)}
                          title="Analyze in AI BRAIN"
                          className="flex items-center gap-1 px-2 py-1.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-md text-[10px] font-medium hover:bg-teal-400/20 transition-all"
                        >
                          <Brain size={11} />
                          Analyze
                        </button>
                        <button
                          title="Open on Upwork"
                          className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(listing.id)}
                          disabled={deletingId === listing.id}
                          title="Delete listing"
                          className="p-1.5 rounded-md hover:bg-red-400/10 text-zinc-600 hover:text-red-400 transition-all disabled:opacity-50"
                        >
                          {deletingId === listing.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}