import React from 'react';
import { TrendingUp, Send, MessageSquare, Briefcase, Target } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const STATS = [
  {
    id: 'stat-proposals',
    label: 'Proposals Sent',
    value: '24',
    sub: 'this month',
    icon: Send,
    color: 'text-teal-400',
    bg: 'bg-teal-400/10',
    trend: '+6 vs last month',
    up: true,
  },
  {
    id: 'stat-response',
    label: 'Response Rate',
    value: '38%',
    sub: '9 of 24 replied',
    icon: MessageSquare,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    trend: '+4% vs last month',
    up: true,
  },
  {
    id: 'stat-active',
    label: 'Active Projects',
    value: '3',
    sub: '1 ending this week',
    icon: Briefcase,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    trend: 'Stable',
    up: null,
  },
  {
    id: 'stat-winrate',
    label: 'Win Rate',
    value: '12.5%',
    sub: '3 contracts won',
    icon: Target,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    trend: '-2% vs last month',
    up: false,
  },
];

export default function StatsBar() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {STATS?.map((stat) => {
        const Icon = stat?.icon;
        return (
          <div key={stat?.id} className="cockpit-card p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${stat?.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={stat?.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider leading-none mb-1">
                {stat?.label}
              </p>
              <p className={`font-mono-data text-xl font-700 ${stat?.color} leading-none`}>
                {stat?.value}
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">{stat?.sub}</p>
              <div className="flex items-center gap-1 mt-1.5">
                {stat?.up === true && <TrendingUp size={10} className="text-emerald-400" />}
                {stat?.up === false && <TrendingUp size={10} className="text-red-400 rotate-180" />}
                <span className={`text-[10px] font-mono ${stat?.up === true ? 'text-emerald-400' : stat?.up === false ? 'text-red-400' : 'text-zinc-500'}`}>
                  {stat?.trend}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}