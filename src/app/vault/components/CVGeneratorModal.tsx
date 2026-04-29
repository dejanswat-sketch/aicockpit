'use client';

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  FileDown,
  Loader2,
  Github as GithubIcon,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Copy,
  AlertCircle,
} from 'lucide-react';
import type { Project } from './PortfolioSection';

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
}

interface GeneratedCV {
  name: string;
  title: string;
  github: string;
  projectLinks: { label: string; url: string }[];
  summary: string;
  starEntries: STAREntry[];
  skills: string[];
  rawText: string;
}

const GITHUB_URL = 'https://github.com/dejanswat-sketch';

function buildCVPrompt(projects: Project[], jobText: string): string {
  const projectList = projects
    .map(
      (p, i) =>
        `Project ${i + 1}: ${p.name}
Category: ${p.category}
Stack: ${p.stack.join(', ')}
Description: ${p.description}
Highlights: ${p.highlights.join('; ')}
${p.githubUrl ? `GitHub: ${p.githubUrl}` : ''}
${p.liveUrl ? `Live: ${p.liveUrl}` : ''}`
    )
    .join('\n\n');

  return `You are an expert CV writer specializing in ATS-friendly technical CVs. Generate a professional CV section for a freelance software architect.

## Candidate Profile
- Name: Dejan (Software Architect & Full-Stack Developer)
- GitHub: ${GITHUB_URL}
- Specialization: Node.js, Android Studio, Supabase, Stripe integrations, Hostinger deployment

## Selected Projects
${projectList}

${jobText ? `## Target Job Description\n${jobText}\n` : ''}

## Instructions
Generate a JSON response with this exact structure:
{
  "name": "Dejan",
  "title": "Software Architect & Full-Stack Developer",
  "github": "${GITHUB_URL}",
  "projectLinks": [{"label": "project name", "url": "url"}],
  "summary": "2-3 sentence ATS-optimized professional summary mentioning key technologies",
  "starEntries": [
    {
      "projectName": "exact project name",
      "situation": "1-2 sentences: business context and challenge",
      "task": "1-2 sentences: your specific responsibility as architect",
      "action": "2-3 sentences: technical decisions and implementation details with specific technologies",
      "result": "1-2 sentences: measurable outcomes and efficiency gains",
      "techStack": ["tech1", "tech2"],
      "links": [{"label": "GitHub", "url": "url"}]
    }
  ],
  "skills": ["skill1", "skill2", "...up to 12 key technical skills"],
  "rawText": "Complete ATS-friendly plain text CV ready for copy-paste"
}

IMPORTANT: 
- Use STAR method strictly for each project
- rawText must be clean plain text, no markdown, no special characters
- Emphasize architect role and efficiency/performance results
- Include specific metrics where possible (e.g., "reduced load time by 40%")
- rawText header must include GitHub and project links`;
}

async function callGeminiWithRetry(
  prompt: string,
  retries = 3,
  delayMs = 1500
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
          temperature: 0.6,
          max_tokens: 4096,
          stream: false,
        }),
      });

      if (res.status === 503 || res.status === 429) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
          continue;
        }
        throw new Error(`Gemini API unavailable after ${retries} attempts`);
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

function downloadTextAsPDF(cv: GeneratedCV) {
  const content = cv.rawText || buildFallbackText(cv);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CV_${cv.name.replace(/\s+/g, '_')}_ATS.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildFallbackText(cv: GeneratedCV): string {
  const links = [
    `GitHub: ${cv.github}`,
    ...cv.projectLinks.map((l) => `${l.label}: ${l.url}`),
  ].join(' | ');

  const projects = cv.starEntries
    .map(
      (e) =>
        `${e.projectName} [${e.techStack.join(', ')}]
Situation: ${e.situation}
Task: ${e.task}
Action: ${e.action}
Result: ${e.result}`
    )
    .join('\n\n');

  return `${cv.name}
${cv.title}
${links}

PROFESSIONAL SUMMARY
${cv.summary}

TECHNICAL SKILLS
${cv.skills.join(', ')}

SELECTED PROJECTS
${projects}`;
}

export default function CVGeneratorModal({
  isOpen,
  onClose,
  selectedProjects,
  jobText,
}: CVGeneratorModalProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedCV, setGeneratedCV] = useState<GeneratedCV | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');

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
                      <a href={generatedCV.github} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-teal-400 transition-colors">
                        <GithubIcon size={10} /> {generatedCV.github}
                      </a>
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
                        </div>
                      ))}
                    </div>
                  </div>

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
                onClick={() => downloadTextAsPDF(generatedCV)}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-lg text-xs font-medium hover:bg-teal-400/20 transition-all"
              >
                <FileDown size={12} />
                Download ATS CV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
