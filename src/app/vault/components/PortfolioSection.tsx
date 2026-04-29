'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Code2, Smartphone, Database, CreditCard, Server, ExternalLink, GitBranch as GithubIcon, Star, Zap, FileDown, ChevronDown, ChevronUp, Globe } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  stack: string[];
  stackIcons: string[];
  category: string;
  highlights: string[];
  githubUrl?: string;
  liveUrl?: string;
  relevanceScore?: number;
}

const STACK_ICON_MAP: Record<string, React.ElementType> = {
  'Node.js': Code2,
  'Android Studio': Smartphone,
  'Supabase': Database,
  'Stripe': CreditCard,
  'Hostinger': Server,
  'Next.js': Globe,
  'React': Code2,
};

const STACK_COLOR_MAP: Record<string, string> = {
  'Node.js': 'text-green-400 bg-green-400/10 border-green-400/20',
  'Android Studio': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Supabase': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'Stripe': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  'Hostinger': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Next.js': 'text-zinc-200 bg-zinc-700/50 border-zinc-600',
  'React': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
};

const PORTFOLIO_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    name: 'AICockpit Automation Platform',
    description: 'Full-stack freelance automation cockpit with AI-powered job analysis, VAULT document management, and dynamic CV generation engine.',
    stack: ['Next.js', 'Node.js', 'Supabase', 'Stripe'],
    stackIcons: ['Next.js', 'Node.js', 'Supabase', 'Stripe'],
    category: 'SaaS Platform',
    highlights: [
      'Gemini 2.5 Flash integration with streaming responses',
      'Supabase Realtime DB with RLS policies',
      'Stripe payment processing architecture',
      'Deployed on Hostinger with CI/CD pipeline',
    ],
    githubUrl: 'https://github.com/dejanswat-sketch/aicockpit',
    liveUrl: 'https://app.nomorequiet.com',
  },
  {
    id: 'proj-002',
    name: 'NezadovoljneZene.com',
    description: 'High-traffic content platform with Node.js backend, optimized for performance and SEO. Handles 50k+ monthly visitors with sub-200ms response times.',
    stack: ['Node.js', 'Hostinger', 'Supabase'],
    stackIcons: ['Node.js', 'Hostinger', 'Supabase'],
    category: 'Content Platform',
    highlights: [
      'Node.js backend with Express.js REST API',
      'Hostinger VPS deployment with Nginx reverse proxy',
      'PostgreSQL via Supabase for user data',
      'SEO-optimized server-side rendering',
    ],
    liveUrl: 'https://nezadovoljnezene.com',
  },
  {
    id: 'proj-003',
    name: 'Android Mobile Commerce App',
    description: 'Native Android e-commerce application with Stripe payment integration, real-time inventory management, and push notifications.',
    stack: ['Android Studio', 'Stripe', 'Node.js'],
    stackIcons: ['Android Studio', 'Stripe', 'Node.js'],
    category: 'Mobile App',
    highlights: [
      'Android Studio with Kotlin, MVVM architecture',
      'Stripe Android SDK for in-app payments',
      'Node.js REST API backend',
      'Firebase push notifications',
    ],
  },
  {
    id: 'proj-004',
    name: 'Supabase Auth & Billing System',
    description: 'Enterprise-grade authentication and subscription billing system combining Supabase Auth with Stripe Billing for SaaS applications.',
    stack: ['Supabase', 'Stripe', 'Node.js'],
    stackIcons: ['Supabase', 'Stripe', 'Node.js'],
    category: 'Backend Architecture',
    highlights: [
      'Supabase Auth with RLS row-level security',
      'Stripe Webhooks for subscription lifecycle',
      'Node.js middleware for billing logic',
      'Multi-tenant architecture with team support',
    ],
  },
  {
    id: 'proj-005',
    name: 'Hostinger VPS Deployment Pipeline',
    description: 'Automated deployment infrastructure for multiple client projects on Hostinger VPS with zero-downtime deployments and monitoring.',
    stack: ['Hostinger', 'Node.js'],
    stackIcons: ['Hostinger', 'Node.js'],
    category: 'DevOps',
    highlights: [
      'Nginx load balancer configuration',
      'PM2 process manager for Node.js apps',
      'Automated SSL certificate renewal',
      'GitHub Actions CI/CD integration',
    ],
  },
];

interface PortfolioSectionProps {
  onGenerateCV?: (selectedProjects: Project[], jobText: string) => void;
  highlightedProjectIds?: string[];
  jobKeywords?: string[];
}

export default function PortfolioSection({ onGenerateCV, highlightedProjectIds = [], jobKeywords = [] }: PortfolioSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else toast.error('Maximum 3 projects for CV generation');
      return next;
    });
  };

  const projects = PORTFOLIO_PROJECTS.map((p) => ({
    ...p,
    relevanceScore: highlightedProjectIds.includes(p.id)
      ? Math.floor(Math.random() * 15) + 85
      : undefined,
  })).sort((a, b) => {
    if (a.relevanceScore && b.relevanceScore) return b.relevanceScore - a.relevanceScore;
    if (a.relevanceScore) return -1;
    if (b.relevanceScore) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-600 text-zinc-200">Portfolio Projects</h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            {highlightedProjectIds.length > 0
              ? `${highlightedProjectIds.length} projects matched to job listing`
              : 'Select up to 3 projects for CV generation'}
          </p>
        </div>
        {selectedIds.size > 0 && onGenerateCV && (
          <button
            onClick={() => {
              const selected = PORTFOLIO_PROJECTS.filter((p) => selectedIds.has(p.id));
              onGenerateCV(selected, '');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-lg text-xs font-medium hover:bg-teal-400/20 transition-all"
          >
            <FileDown size={13} />
            Generate CV ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Tech stack legend */}
      <div className="flex flex-wrap gap-2">
        {['Node.js', 'Android Studio', 'Supabase', 'Stripe', 'Hostinger'].map((tech) => {
          const colorClass = STACK_COLOR_MAP[tech] || 'text-zinc-400 bg-zinc-800 border-zinc-700';
          return (
            <span key={tech} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border ${colorClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {tech}
            </span>
          );
        })}
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {projects.map((project) => {
          const isExpanded = expandedId === project.id;
          const isSelected = selectedIds.has(project.id);
          const isHighlighted = highlightedProjectIds.includes(project.id);

          return (
            <div
              key={project.id}
              className={`cockpit-card p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-teal-400/40 bg-teal-400/5'
                  : isHighlighted
                  ? 'border-emerald-400/30 bg-emerald-400/5' :'cockpit-card-hover'
              }`}
              onClick={() => toggleSelect(project.id)}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
                      {project.category}
                    </span>
                    {isHighlighted && project.relevanceScore && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                        <Star size={8} className="fill-emerald-400" />
                        {project.relevanceScore}% match
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-600 text-zinc-100 leading-snug">{project.name}</h4>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-teal-400 flex items-center justify-center">
                      <Zap size={10} className="text-zinc-900" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleExpand(project.id); }}
                    className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-500 leading-relaxed">{project.description}</p>

              {/* Stack tags */}
              <div className="flex flex-wrap gap-1.5">
                {project.stack.map((tech) => {
                  const colorClass = STACK_COLOR_MAP[tech] || 'text-zinc-400 bg-zinc-800 border-zinc-700';
                  return (
                    <span key={`${project.id}-${tech}`} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colorClass}`}>
                      {tech}
                    </span>
                  );
                })}
              </div>

              {/* Expanded highlights */}
              {isExpanded && (
                <div className="pt-2 border-t border-zinc-800 animate-fade-in">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Key Highlights</p>
                  <ul className="space-y-1">
                    {project.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <span className="text-teal-400 mt-0.5 flex-shrink-0">→</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mt-3">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-[10px] font-medium hover:border-zinc-600 hover:text-zinc-200 transition-all"
                      >
                        <GithubIcon size={11} />
                        GitHub
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-[10px] font-medium hover:border-zinc-600 hover:text-zinc-200 transition-all"
                      >
                        <ExternalLink size={11} />
                        Live
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PORTFOLIO_PROJECTS };
export type { Project };
