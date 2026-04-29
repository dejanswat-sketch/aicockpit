'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Send, MessageSquare, Briefcase, Target, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface StatsData {
  proposalsSent: number;
  totalReplied: number;
  activeProjects: number;
  contractsWon: number;
  totalJobs: number;
}

async function fetchStats(): Promise<StatsData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { proposalsSent: 0, totalReplied: 0, activeProjects: 0, contractsWon: 0, totalJobs: 0 };

  const [submissionsRes, jobsRes] = await Promise.all([
    supabase.from('submissions').select('status').eq('user_id', user.id),
    supabase.from('job_listings').select('job_status').eq('user_id', user.id),
  ]);

  const submissions = submissionsRes.data || [];
  const jobs = jobsRes.data || [];

  const proposalsSent = submissions.length;
  const totalReplied = submissions.filter((s) =>
    ['viewed', 'interview', 'offer', 'rejected'].includes(s.status)
  ).length;
  const contractsWon = submissions.filter((s) => s.status === 'offer').length;
  const activeProjects = jobs.filter((j) => j.job_status === 'shortlisted').length;
  const totalJobs = jobs.length;

  return { proposalsSent, totalReplied, activeProjects, contractsWon, totalJobs };
}

export default function StatsBar() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats({ proposalsSent: 0, totalReplied: 0, activeProjects: 0, contractsWon: 0, totalJobs: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const responseRate = stats && stats.proposalsSent > 0
    ? Math.round((stats.totalReplied / stats.proposalsSent) * 100)
    : 0;

  const winRate = stats && stats.proposalsSent > 0
    ? Math.round((stats.contractsWon / stats.proposalsSent) * 100 * 10) / 10
    : 0;

  const STATS = [
    {
      id: 'stat-proposals',
      label: 'Proposals Sent',
      value: loading ? '—' : String(stats?.proposalsSent ?? 0),
      sub: 'total submissions',
      icon: Send,
      color: 'text-teal-400',
      bg: 'bg-teal-400/10',
      trend: loading ? '...' : `${stats?.totalJobs ?? 0} jobs tracked`,
      up: null as boolean | null,
    },
    {
      id: 'stat-response',
      label: 'Response Rate',
      value: loading ? '—' : `${responseRate}%`,
      sub: loading ? '...' : `${stats?.totalReplied ?? 0} of ${stats?.proposalsSent ?? 0} replied`,
      icon: MessageSquare,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      trend: responseRate >= 30 ? 'Good response rate' : 'Keep applying',
      up: responseRate >= 30 ? true : null,
    },
    {
      id: 'stat-active',
      label: 'Active Projects',
      value: loading ? '—' : String(stats?.activeProjects ?? 0),
      sub: 'shortlisted jobs',
      icon: Briefcase,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      trend: 'From RADAR',
      up: null as boolean | null,
    },
    {
      id: 'stat-winrate',
      label: 'Win Rate',
      value: loading ? '—' : `${winRate}%`,
      sub: loading ? '...' : `${stats?.contractsWon ?? 0} offers received`,
      icon: Target,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      trend: winRate >= 10 ? 'Above average' : 'Keep going',
      up: winRate >= 10 ? true : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.id} className="cockpit-card p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              {loading ? (
                <Loader2 size={16} className={`${stat.color} animate-spin`} />
              ) : (
                <Icon size={16} className={stat.color} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider leading-none mb-1">
                {stat.label}
              </p>
              <p className={`font-mono-data text-xl font-700 ${stat.color} leading-none`}>
                {stat.value}
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">{stat.sub}</p>
              <div className="flex items-center gap-1 mt-1.5">
                {stat.up === true && <TrendingUp size={10} className="text-emerald-400" />}
                {stat.up === false && <TrendingUp size={10} className="text-red-400 rotate-180" />}
                <span className={`text-[10px] font-mono ${stat.up === true ? 'text-emerald-400' : stat.up === false ? 'text-red-400' : 'text-zinc-500'}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}