'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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

export default function RadarContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [listings, setListings] = useState<JobListing[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchSearch =
        search === '' ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.skills.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        l.client.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [listings, search, statusFilter]);

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
      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search listings, skills, clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all"
          />
        </div>

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
      </div>

      {/* Filter chips */}
      {showFilters && (
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

      {/* Listings grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Radio size={40} className="text-zinc-700 mb-4" />
          <p className="text-zinc-400 font-medium">No listings match your search</p>
          <p className="text-zinc-600 text-sm mt-1">Try adjusting your search or filters</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="mt-4 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
          >
            Clear filters
          </button>
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
                {/* Header */}
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
                  {/* Match score */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${MATCH_BG(listing.matchScore)} flex flex-col items-center justify-center`}>
                    <span className={`font-mono-data text-base font-700 leading-none ${MATCH_COLOR(listing.matchScore)}`}>
                      {listing.matchScore}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-mono mt-0.5">MATCH</span>
                  </div>
                </div>

                {/* Client info */}
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="text-zinc-400 font-medium">{listing.client}</span>
                  <span className="flex items-center gap-0.5">
                    <Star size={10} className="text-amber-400 fill-amber-400" />
                    <span className="font-mono">{listing.clientRating}</span>
                  </span>
                  <span className="font-mono text-zinc-600">{listing.clientSpend} spent</span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                  {listing.description}
                </p>

                {/* Skills */}
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

                {/* Footer */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => toggleSave(listing.id)}
                      title={listing.saved ? 'Unsave' : 'Save listing'}
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}