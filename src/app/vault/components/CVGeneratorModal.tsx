'use client';

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  FileDown,
  Loader2,
  GitBranch as GithubIcon,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Copy,
  AlertCircle,
} from 'lucide-react';
import type { Project } from './PortfolioSection';
import { useAuth } from '@/contexts/AuthContext';

interface CVGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjects: Project[];
  jobText: string;
}

interface STAREntry {
  projectName: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  techStack: string[];
  links: { label: string; url: string }[];
  visualEvidence?: { filename: string; caption: string; url: string }[];
}

interface WorkExperience {
  company: string;
  role: string;
  period: string;
  description: string;
  highlights?: string[];
}

interface GeneratedCV {
  name: string;
  title: string;
  email: string;
  github: string;
  linkedin?: string;
  projectLinks: { label: string; url: string }[];
  summary: string;
  starEntries: STAREntry[];
  workExperience?: WorkExperience[];
  skills: string[];
  rawText: string;
}

const GITHUB_URL = 'https://github.com/dejanswat-sketch';
const CONTACT_EMAIL = 'dejanwarrior@gmail.com';
const LINKEDIN_URL = 'https://linkedin.com/in/dejan';

// Visual portfolio mapping: project name → screenshot info
const VISUAL_PORTFOLIO: Record<string, { filename: string; caption: string; url: string }[]> = {
  'AICockpit': [
    {
      filename: 'image_a65e54.png',
      caption: 'VAULT section with pre-loaded projects and CV Generator',
      url: 'https://aicockpit5745.builtwithrocket.new',
    },
    {
      filename: 'image_a6521a.png',
      caption: 'Dynamic CV Generator modal with 3 selected projects',
      url: 'https://aicockpit5745.builtwithrocket.new',
    },
  ],
  'NoMoreQuiet': [
    {
      filename: 'image_a580db.png',
      caption: 'Main screen — "The place where silence finally finds its voice"',
      url: 'https://app.nomorequiet.com',
    },
    {
      filename: 'image_a57574.png',
      caption: 'PostgreSQL database structure in DBeaver',
      url: 'https://app.nomorequiet.com',
    },
  ],
  'NezadovoljneZene': [
    {
      filename: 'image_a57c5f.jpg',
      caption: '"Digitalna Ludnica" UI with AI agent Valerijan',
      url: 'https://nezadovoljnezene.com',
    },
  ],
  'AI Rental Platform': [
    {
      filename: 'image_a578b9.jpg',
      caption: 'Landing page with AI-powered smart property search',
      url: '#',
    },
  ],
  'Wealth Terminal': [
    {
      filename: 'image_a5783e.png',
      caption: 'Financial dashboard with $28M portfolio overview',
      url: '#',
    },
  ],
  'Backend Ktor/Kotlin': [
    {
      filename: 'image_a57953.png',
      caption: 'IntelliJ IDE — travel-backend with JWT session management',
      url: 'https://github.com/dejanswat-sketch',
    },
  ],
};

function getPortfolioForProject(projectName: string): { filename: string; caption: string; url: string }[] {
  const key = Object.keys(VISUAL_PORTFOLIO).find((k) =>
    projectName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(projectName.toLowerCase().split(' ')[0])
  );
  return key ? VISUAL_PORTFOLIO[key] : [];
}

function buildCVPrompt(projects: Project[], jobText: string): string {
  const projectList = projects
    .map((p, i) => {
      const portfolio = getPortfolioForProject(p.name);
      const portfolioStr = portfolio.length
        ? `Visual Evidence:\n${portfolio.map((v) => `  - ${v.filename}: ${v.caption} → ${v.url}`).join('\n')}`
        : '';
      return `Project ${i + 1}: ${p.name}
Category: ${p.category}
Stack: ${p.stack.join(', ')}
Description: ${p.description}
Highlights: ${p.highlights.join('; ')}
${p.githubUrl ? `GitHub: ${p.githubUrl}` : ''}
${p.liveUrl ? `Live: ${p.liveUrl}` : ''}
${portfolioStr}`;
    })
    .join('\n\n');

  return `You are an expert CV writer specializing in ATS-friendly technical CVs. Generate a COMPLETE MASTER CV for a senior freelance software architect.

## Candidate Profile
- Name: Dejan (Software Architect & Full-Stack Developer)
- Email: ${CONTACT_EMAIL} (PRIMARY contact — no phone number, ever)
- GitHub: ${GITHUB_URL}
- LinkedIn: ${LINKEDIN_URL} (optional)
- Specialization: Node.js, Next.js, Android Studio, Supabase, Stripe, Kotlin/Ktor, AI integrations, Hostinger deployment
- Contact Note: Client contact is EXCLUSIVELY via email: ${CONTACT_EMAIL}

## Selected Projects (with Visual Evidence)
${projectList}

## Previous Work Experience (MANDATORY — include in CV)
1. Direkcija za mere i dragocene metale (Bureau of Measures and Precious Metals)
   - Role: Technical specialist working on high-precision measurement systems
   - Relevance: Guarantees engineering precision and pedantic code quality
   - Key skill: Attention to detail, standards compliance, systematic approach

2. Zastupništvo Goodman Airconditioning & PDQ Manufacturing
   - Role: Technical representative managing global brand partnerships
   - Relevance: Experience collaborating with global industry leaders, managing technical representations
   - Key skill: International B2B communication, technical documentation, project coordination

${jobText ? `## Target Job Description\n${jobText}\n` : ''}

## Instructions
Generate a JSON response with this EXACT structure — this is a MASTER CV, include ALL sections:
{
  "name": "Dejan",
  "title": "Software Architect & Full-Stack Developer",
  "email": "${CONTACT_EMAIL}",
  "github": "${GITHUB_URL}",
  "linkedin": "${LINKEDIN_URL}",
  "projectLinks": [{"label": "project name", "url": "url"}],
  "summary": "3-4 sentence ATS-optimized professional summary combining technical expertise with precision background",
  "starEntries": [
    {
      "projectName": "exact project name",
      "situation": "1-2 sentences: business context and challenge",
      "task": "1-2 sentences: your specific responsibility as architect",
      "action": "2-3 sentences: technical decisions and implementation with specific technologies",
      "result": "1-2 sentences: measurable outcomes (e.g. 80% automation, reduced time by X%)",
      "techStack": ["tech1", "tech2"],
      "links": [{"label": "Live", "url": "url"}, {"label": "GitHub", "url": "url"}],
      "visualEvidence": [{"filename": "image_xxx.png", "caption": "description", "url": "link"}]
    }
  ],
  "workExperience": [
    {
      "company": "Direkcija za mere i dragocene metale",
      "role": "Technical Specialist — High-Precision Measurement Systems",
      "period": "Prior to freelance",
      "description": "Worked on certified high-precision measurement systems, developing systematic and pedantic approach to engineering that directly translates to clean, reliable code architecture.",
      "highlights": ["High-precision systems", "Standards compliance", "Engineering discipline"]
    },
    {
      "company": "Zastupništvo Goodman Airconditioning & PDQ Manufacturing",
      "role": "Technical Representative — Global Brand Partnerships",
      "period": "Prior to freelance",
      "description": "Managed technical representations for global industry leaders Goodman Airconditioning and PDQ Manufacturing, coordinating international B2B relationships and technical documentation.",
      "highlights": ["Global B2B partnerships", "Technical documentation", "International coordination"]
    }
  ],
  "skills": ["Next.js", "Node.js", "TypeScript", "Kotlin/Ktor", "Android Studio", "Supabase", "PostgreSQL", "Stripe", "AI/LLM Integration", "REST APIs", "JWT Auth", "Hostinger Deployment"],
  "rawText": "Complete ATS-friendly plain text master CV ready for copy-paste — MUST include all sections: header, summary, featured projects with STAR, visual portfolio references, work experience, skills"
}

CRITICAL RULES:
- NEVER include phone number anywhere — email ONLY: ${CONTACT_EMAIL}
- rawText must be clean plain text, no markdown symbols, no special characters
- Include ALL work experience entries in rawText
- Include visual portfolio references in rawText as: "[Visual: filename — caption — url]"
- Emphasize 80% automation result for AICockpit
- Include specific metrics for every project result
- rawText must be a complete, standalone document ready to send to a client`;
}

async function callGeminiWithRetry(
  prompt: string,
  retries = 3,
  delayMs = 3000
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'GEMINI',
          model: 'gemini/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          parameters: {
            temperature: 0.6,
            max_tokens: 4096,
          },
        }),
      });

      if (res.status === 503 || res.status === 429) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
          continue;
        }
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.details || errData?.error || '';
        if (res.status === 429) {
          throw new Error('Gemini free tier quota exceeded. Please wait a minute and try again, or upgrade your Gemini API plan.');
        }
        throw new Error(`Gemini API unavailable after ${retries} attempts. Please try again shortly.`);
      }

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      return data.content || data.message || '';
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  throw new Error('Failed after retries');
}

function parseGeminiResponse(raw: string): GeneratedCV | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as GeneratedCV;
  } catch {
    return null;
  }
}

async function downloadCVAsPDF(cv: GeneratedCV) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18;
  const marginR = 18;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 15) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addText = (
    text: string,
    x: number,
    fontSize: number,
    color: [number, number, number],
    style: 'normal' | 'bold' = 'normal',
    maxWidth?: number
  ) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont('helvetica', style);
    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length;
    }
    doc.text(text, x, y);
    return 1;
  };

  const sectionHeader = (title: string) => {
    checkPage(12);
    y += 4;
    doc.setFillColor(20, 184, 166); // teal-500
    doc.rect(marginL, y - 3.5, contentW, 0.5, 'F');
    addText(title.toUpperCase(), marginL, 8, [20, 184, 166], 'bold');
    y += 6;
  };

  // ── NAME & TITLE ─────────────────────────────────────────────────────────
  addText(cv.name || 'Dejan', marginL, 22, [15, 23, 42], 'bold');
  y += 8;
  addText(cv.title || 'Software Architect & Full-Stack Developer', marginL, 11, [71, 85, 105], 'normal');
  y += 6;

  // ── CONTACT LINE ─────────────────────────────────────────────────────────
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  const contactParts = [
    `✉ ${cv.email || CONTACT_EMAIL}`,
    `⌥ ${cv.github || GITHUB_URL}`,
    ...(cv.linkedin ? [`in ${cv.linkedin}`] : []),
  ];
  doc.text(contactParts.join('   |   '), marginL, y);
  y += 8;

  // divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  if (cv.summary) {
    sectionHeader('Professional Summary');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(cv.summary, contentW);
    checkPage(summaryLines.length * 5 + 4);
    doc.text(summaryLines, marginL, y);
    y += summaryLines.length * 5 + 4;
  }

  // ── SKILLS ───────────────────────────────────────────────────────────────
  if (cv.skills?.length) {
    sectionHeader('Technical Skills');
    const skillText = cv.skills.join('  ·  ');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    const skillLines = doc.splitTextToSize(skillText, contentW);
    checkPage(skillLines.length * 5 + 4);
    doc.text(skillLines, marginL, y);
    y += skillLines.length * 5 + 4;
  }

  // ── STAR ENTRIES ─────────────────────────────────────────────────────────
  if (cv.starEntries?.length) {
    sectionHeader('Featured Projects — STAR Method');

    for (const entry of cv.starEntries) {
      checkPage(40);

      // Project name + stack
      doc.setFontSize(10);
      doc.setTextColor(15, 118, 110); // teal-700
      doc.setFont('helvetica', 'bold');
      doc.text(entry.projectName, marginL, y);

      const stackStr = (entry.techStack || []).slice(0, 5).join(', ');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      const stackW = doc.getTextWidth(stackStr);
      doc.text(stackStr, pageW - marginR - stackW, y);
      y += 5;

      // STAR rows
      const starRows: { label: string; content: string }[] = [
        { label: 'S', content: entry.situation },
        { label: 'T', content: entry.task },
        { label: 'A', content: entry.action },
        { label: 'R', content: entry.result },
      ];

      for (const row of starRows) {
        const lines = doc.splitTextToSize(row.content || '', contentW - 10);
        checkPage(lines.length * 4.5 + 3);

        // Label badge
        doc.setFillColor(204, 251, 241); // teal-100
        doc.roundedRect(marginL, y - 3, 5, 4.5, 0.8, 0.8, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 118, 110);
        doc.setFont('helvetica', 'bold');
        doc.text(row.label, marginL + 1.2, y);

        // Content
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, marginL + 8, y);
        y += lines.length * 4.5 + 2;
      }

      // Visual evidence
      const portfolio = entry.visualEvidence?.length
        ? entry.visualEvidence
        : getPortfolioForProject(entry.projectName);

      if (portfolio.length) {
        checkPage(portfolio.length * 5 + 5);
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text('Visual Evidence:', marginL + 8, y);
        y += 4;
        for (const v of portfolio) {
          checkPage(5);
          doc.setFontSize(7.5);
          doc.setTextColor(15, 118, 110);
          doc.setFont('helvetica', 'normal');
          const evidenceLine = `${v.filename}  —  ${v.caption}  →  ${v.url}`;
          const evLines = doc.splitTextToSize(evidenceLine, contentW - 12);
          doc.text(evLines, marginL + 10, y);
          y += evLines.length * 4 + 1;
        }
      }

      // Project links
      if (entry.links?.length) {
        checkPage(6);
        const linkStr = entry.links.map((l) => `${l.label}: ${l.url}`).join('   ');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        const lLines = doc.splitTextToSize(linkStr, contentW - 8);
        doc.text(lLines, marginL + 8, y);
        y += lLines.length * 4 + 1;
      }

      y += 5;
      // thin separator
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginL, y - 2, pageW - marginR, y - 2);
    }
  }

  // ── WORK EXPERIENCE ──────────────────────────────────────────────────────
  const workExp = cv.workExperience?.length
    ? cv.workExperience
    : [
        {
          company: 'Direkcija za mere i dragocene metale',
          role: 'Technical Specialist — High-Precision Measurement Systems',
          period: 'Prior to freelance',
          description:
            'Worked on certified high-precision measurement systems, developing a systematic and pedantic approach to engineering that directly translates to clean, reliable code architecture.',
          highlights: ['High-precision systems', 'Standards compliance', 'Engineering discipline'],
        },
        {
          company: 'Zastupništvo Goodman Airconditioning & PDQ Manufacturing',
          role: 'Technical Representative — Global Brand Partnerships',
          period: 'Prior to freelance',
          description:
            'Managed technical representations for global industry leaders, coordinating international B2B relationships and technical documentation.',
          highlights: ['Global B2B partnerships', 'Technical documentation', 'International coordination'],
        },
      ];

  if (workExp.length) {
    sectionHeader('Previous Work Experience');
    for (const w of workExp) {
      checkPage(28);
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(w.company, marginL, y);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      const periodW = doc.getTextWidth(w.period);
      doc.text(w.period, pageW - marginR - periodW, y);
      y += 5;

      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.text(w.role, marginL, y);
      y += 5;

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(w.description, contentW);
      checkPage(descLines.length * 4.5 + 3);
      doc.text(descLines, marginL, y);
      y += descLines.length * 4.5 + 3;

      if (w.highlights?.length) {
        checkPage(6);
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(w.highlights.join('  ·  '), marginL, y);
        y += 5;
      }
      y += 3;
    }
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${cv.name || 'Dejan'} — ${cv.title || 'Software Architect'}  |  ${cv.email || CONTACT_EMAIL}  |  Page ${i} of ${totalPages}`,
      marginL,
      pageH - 8
    );
  }

  doc.save(`CV_${(cv.name || 'Dejan').replace(/\s+/g, '_')}_Master.pdf`);
}

function buildFallbackText(cv: GeneratedCV): string {
  const contactParts = [
    `Email: ${cv.email || CONTACT_EMAIL}`,
    `GitHub: ${cv.github || GITHUB_URL}`,
  ];
  if (cv.linkedin) contactParts.push(`LinkedIn: ${cv.linkedin}`);
  const links = [
    ...contactParts,
    ...(cv.projectLinks || []).map((l) => `${l.label}: ${l.url}`),
  ].join(' | ');

  const projects = (cv.starEntries || [])
    .map((e) => {
      const portfolio = getPortfolioForProject(e.projectName);
      const visualStr = portfolio.length
        ? `\nVisual Evidence:\n${portfolio.map((v) => `  [Visual: ${v.filename} — ${v.caption} — ${v.url}]`).join('\n')}`
        : '';
      return `${e.projectName} [${(e.techStack || []).join(', ')}]
Situation: ${e.situation}
Task: ${e.task}
Action: ${e.action}
Result: ${e.result}${visualStr}`;
    })
    .join('\n\n');

  const workExp = ((cv as any).workExperience || [
    {
      company: 'Direkcija za mere i dragocene metale',
      role: 'Technical Specialist — High-Precision Measurement Systems',
      period: 'Prior to freelance',
      description: 'Worked on certified high-precision measurement systems, developing systematic and pedantic approach to engineering that directly translates to clean, reliable code architecture.',
    },
    {
      company: 'Zastupništvo Goodman Airconditioning & PDQ Manufacturing',
      role: 'Technical Representative — Global Brand Partnerships',
      period: 'Prior to freelance',
      description: 'Managed technical representations for global industry leaders, coordinating international B2B relationships and technical documentation.',
    },
  ])
    .map(
      (w: any) =>
        `${w.company}
${w.role} | ${w.period}
${w.description}`
    )
    .join('\n\n');

  return `${cv.name || 'Dejan'}
${cv.title || 'Software Architect & Full-Stack Developer'}
${links}

PROFESSIONAL SUMMARY
${cv.summary || ''}

TECHNICAL SKILLS
${(cv.skills || []).join(', ')}

FEATURED PROJECTS (STAR Method)
${projects}

PREVIOUS WORK EXPERIENCE
${workExp}

CONTACT
Email: ${CONTACT_EMAIL} (primary — no phone)
GitHub: ${GITHUB_URL}`;
}

export default function CVGeneratorModal({
  isOpen,
  onClose,
  selectedProjects,
  jobText,
}: CVGeneratorModalProps) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<GeneratedCV | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const generateCV = useCallback(async () => {
    if (selectedProjects.length === 0) return;
    setGenerating(true);
    setError(null);
    setGeneratedCV(null);

    try {
      const prompt = buildCVPrompt(selectedProjects, jobText);
      const raw = await callGeminiWithRetry(prompt);
      const cv = parseGeminiResponse(raw);
      if (!cv) throw new Error('Could not parse CV response. Please try again.');
      setGeneratedCV(cv);
      toast.success('CV generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate CV');
      toast.error('CV generation failed');
    } finally {
      setGenerating(false);
    }
  }, [selectedProjects, jobText]);

  const copyRawText = () => {
    if (!generatedCV) return;
    const text = generatedCV.rawText || buildFallbackText(generatedCV);
    navigator.clipboard.writeText(text);
    toast.success('CV text copied to clipboard');
  };

  const handleDownloadPDF = async () => {
    if (!generatedCV) return;
    setDownloadingPDF(true);
    try {
      await downloadCVAsPDF(generatedCV);
      toast.success('PDF downloaded successfully!');

      // Trigger Resend email via Supabase Edge Function
      if (user?.id) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          // Extract job title and company from jobText if available
          const jobTitle = generatedCV.title || 'Software Architect & Full-Stack Developer';
          const company = jobText
            ? jobText.split('\n')[0]?.slice(0, 80) || 'Prospective Client'
            : 'Prospective Client';
          const cvName = `CV_${(generatedCV.name || 'Dejan').replace(/\s+/g, '_')}_Master.pdf`;

          await fetch(
            `${supabaseUrl}/functions/v1/send-submission-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                record: {
                  user_id: user.id,
                  job_title: jobTitle,
                  company: company,
                  cv_name: cvName,
                  job_url: '',
                  notes: selectedProjects.map((p) => p.name).join(', '),
                  submitted_at: new Date().toISOString(),
                },
              }),
            }
          );
        } catch {
          // Email trigger is non-blocking — silently ignore failures
        }
      }
    } catch (err: any) {
      toast.error('PDF generation failed. Try copying the text instead.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-600 text-zinc-100">Dynamic CV Generator</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected · STAR method · ATS-friendly
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Selected projects summary */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Selected Projects</p>
            <div className="flex flex-wrap gap-2">
              {selectedProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <span className="text-xs font-medium text-zinc-300">{p.name}</span>
                  <div className="flex gap-1">
                    {p.stack.slice(0, 2).map((t) => (
                      <span key={t} className="text-[9px] text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Header links info */}
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl">
            <GithubIcon size={14} className="text-zinc-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400">CV header will include GitHub + project links</p>
              <p className="text-[10px] text-zinc-600 font-mono truncate">{GITHUB_URL}</p>
            </div>
          </div>

          {/* Generate button */}
          {!generatedCV && (
            <button
              onClick={generateCV}
              disabled={generating}
              className="flex items-center justify-center gap-2 w-full py-3 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-xl text-sm font-medium hover:bg-teal-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating with STAR method...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Generate ATS-Friendly CV
                </>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-400/5 border border-red-400/20 rounded-xl">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-400">Generation failed</p>
                <p className="text-xs text-zinc-500 mt-0.5">{error}</p>
                <button onClick={generateCV} className="mt-2 text-xs text-teal-400 hover:underline">
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Generated CV */}
          {generatedCV && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">CV Generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-zinc-800 rounded-lg p-0.5">
                    {(['preview', 'raw'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          activeTab === tab ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tab === 'preview' ? 'Preview' : 'Raw Text'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeTab === 'preview' && (
                <div className="flex flex-col gap-4">
                  {/* CV Header */}
                  <div className="p-4 bg-zinc-800/60 border border-zinc-700 rounded-xl">
                    <h3 className="text-base font-700 text-zinc-100">{generatedCV.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{generatedCV.title}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a href={`mailto:${generatedCV.email || CONTACT_EMAIL}`}
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-teal-400 transition-colors">
                        <ExternalLink size={10} /> {generatedCV.email || CONTACT_EMAIL}
                      </a>
                      <a href={generatedCV.github} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-teal-400 transition-colors">
                        <GithubIcon size={10} /> {generatedCV.github}
                      </a>
                      {generatedCV.linkedin && (
                        <a href={generatedCV.linkedin} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-teal-400 transition-colors">
                          <ExternalLink size={10} /> LinkedIn
                        </a>
                      )}
                      {generatedCV.projectLinks?.map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-teal-400 transition-colors">
                          <ExternalLink size={10} /> {link.label}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Professional Summary</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{generatedCV.summary}</p>
                  </div>

                  {/* STAR entries */}
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Projects (STAR Method)</p>
                    <div className="flex flex-col gap-3">
                      {generatedCV.starEntries?.map((entry, i) => (
                        <div key={i} className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-600 text-zinc-200">{entry.projectName}</h4>
                            <div className="flex gap-1">
                              {entry.techStack?.slice(0, 3).map((t) => (
                                <span key={t} className="text-[9px] text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'S', title: 'Situation', content: entry.situation },
                              { label: 'T', title: 'Task', content: entry.task },
                              { label: 'A', title: 'Action', content: entry.action },
                              { label: 'R', title: 'Result', content: entry.result },
                            ].map(({ label, title, content }) => (
                              <div key={label} className="flex gap-2">
                                <span className="w-5 h-5 rounded bg-teal-400/15 text-teal-400 text-[10px] font-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {label}
                                </span>
                                <div>
                                  <p className="text-[9px] text-zinc-600 uppercase tracking-wide">{title}</p>
                                  <p className="text-[10px] text-zinc-400 leading-relaxed">{content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Visual Evidence per project */}
                          {(() => {
                            const portfolio = entry.visualEvidence?.length
                              ? entry.visualEvidence
                              : getPortfolioForProject(entry.projectName);
                            return portfolio.length > 0 ? (
                              <div className="mt-2 pt-2 border-t border-zinc-700/40">
                                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Visual Evidence</p>
                                <div className="flex flex-col gap-1">
                                  {portfolio.map((v, vi) => (
                                    <a
                                      key={vi}
                                      href={v.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-[10px] text-teal-400/80 hover:text-teal-400 transition-colors"
                                    >
                                      <ExternalLink size={9} className="flex-shrink-0" />
                                      <span className="font-mono text-zinc-500">{v.filename}</span>
                                      <span className="text-zinc-600">—</span>
                                      <span className="text-zinc-400 truncate">{v.caption}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work Experience */}
                  {(generatedCV.workExperience && generatedCV.workExperience.length > 0) && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Previous Work Experience</p>
                      <div className="flex flex-col gap-3">
                        {generatedCV.workExperience.map((w, i) => (
                          <div key={i} className="p-3 bg-zinc-800/30 border border-zinc-700/40 rounded-xl">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="text-xs font-600 text-zinc-200">{w.company}</h4>
                              <span className="text-[9px] text-zinc-600 whitespace-nowrap">{w.period}</span>
                            </div>
                            <p className="text-[10px] text-teal-400/70 mb-1">{w.role}</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">{w.description}</p>
                            {w.highlights && w.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {w.highlights.map((h) => (
                                  <span key={h} className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/50">{h}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {generatedCV.skills?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Technical Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedCV.skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="relative">
                  <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-zinc-400 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {generatedCV.rawText || buildFallbackText(generatedCV)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {generatedCV && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 flex-shrink-0">
            <button
              onClick={generateCV}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <Sparkles size={12} />
              Regenerate
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={copyRawText}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-medium hover:border-zinc-600 transition-all"
              >
                <Copy size={12} />
                Copy Text
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-lg text-xs font-medium hover:bg-teal-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown size={12} />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
