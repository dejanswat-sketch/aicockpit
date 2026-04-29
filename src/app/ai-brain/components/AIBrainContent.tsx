'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Brain, Send, Sparkles, FileText, Copy, RotateCcw, Loader2, CheckCircle2, Radio, Archive, MessageSquare, Zap, User, Key, X, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import { vaultDocumentsService, chatAnalysesService, jobListingsService, type VaultDocument, type ChatAnalysis, type JobListing } from '@/lib/services/cockpitService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface VaultDoc {
  id: string;
  name: string;
  type: string;
  selected: boolean;
  storagePath: string | null;
  tags: string[];
}

interface ActiveListing {
  id: string;
  title: string;
  budget: string;
  matchScore: number;
  skills: string[];
}

const QUICK_PROMPTS = [
  { id: 'qp-analyze', label: 'Analyze Match', prompt: 'Analyze my fit for this job listing based on my CV and portfolio. Give me a detailed match breakdown.' },
  { id: 'qp-proposal', label: 'Draft Proposal', prompt: "Write a compelling proposal for this job listing tailored to the client\'s requirements and my experience." },
  { id: 'qp-questions', label: 'Clarifying Questions', prompt: 'What clarifying questions should I ask the client before submitting a proposal?' },
  { id: 'qp-rate', label: 'Rate Advice', prompt: 'Based on the budget range and my experience level, what rate should I bid? Justify your recommendation.' },
  { id: 'qp-risks', label: 'Project Risks', prompt: 'What are the potential red flags or risks in this job listing I should be aware of?' },
];

function buildSystemPrompt(selectedDocs: VaultDoc[], listing: ActiveListing | null): string {
  const docList = selectedDocs.map((d) => {
    const tagStr = d.tags.length > 0 ? ` [tags: ${d.tags.join(', ')}]` : '';
    return `- ${d.name} (${d.type})${tagStr}`;
  }).join('\n');

  const listingSection = listing
    ? `## Active Job Listing\nTitle: ${listing.title}\nBudget: ${listing.budget}\nMatch Score: ${listing.matchScore}/100\nRequired Skills: ${listing.skills.join(', ')}`
    : `## Active Job Listing\nNo job listing selected. Ask the user to select a job from the RADAR section.`;

  return `You are AI BRAIN, an expert freelance career advisor and proposal strategist integrated into a freelancer's cockpit application.

${listingSection}

## Vault Documents in Context
The following documents from the user's Vault are loaded as context for this analysis:
${docList || 'No documents selected. Ask the user to select documents from the Vault panel.'}

## Candidate Contact Info
- Primary contact: dejanwarrior@gmail.com (email only — no phone number)
- GitHub: https://github.com/dejanswat-sketch
- LinkedIn: https://linkedin.com/in/dejan (optional)

## Your Role
- Analyze job listings against the user's CV and portfolio documents
- Draft compelling, personalized proposals
- Identify project risks and red flags
- Advise on competitive bidding rates
- Suggest clarifying questions for clients
- Provide strategic freelance career advice

## Guidelines
- Be concise, actionable, and direct
- Use markdown formatting for structured responses (headers, bullet points, bold text)
- Reference the specific job listing details and user's documents when relevant
- Focus on practical, immediately usable advice
- When analyzing match, provide specific evidence from the user's background
- IMPORTANT: When drafting any proposal or cover letter, always end with this exact sentence: "Molim vas da me kontaktirate isključivo putem email adrese radi detaljnije diskusije o projektu."`;
}

function formatMessage(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={`line-${i}`} className="text-sm font-700 text-zinc-100 mt-3 mb-1">{line.replace('## ', '')}</h3>;
    if (line.startsWith('### ')) return <h4 key={`line-${i}`} className="text-xs font-600 text-zinc-300 mt-2 mb-0.5 uppercase tracking-wide">{line.replace('### ', '')}</h4>;
    if (line.startsWith('- **')) {
      const parts = line.replace('- **', '').split('**');
      return <li key={`line-${i}`} className="text-xs text-zinc-400 ml-3 mb-0.5 list-disc list-inside"><span className="text-zinc-200 font-600">{parts[0]}</span>{parts[1]}</li>;
    }
    if (line.startsWith('- ')) return <li key={`line-${i}`} className="text-xs text-zinc-400 ml-3 mb-0.5 list-disc list-inside">{line.replace('- ', '')}</li>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={`line-${i}`} className="text-xs font-600 text-zinc-200 my-1">{line.replace(/\*\*/g, '')}</p>;
    if (line === '---') return <hr key={`line-${i}`} className="border-zinc-800 my-2" />;
    if (line === '') return <br key={`line-${i}`} />;
    return <p key={`line-${i}`} className="text-xs text-zinc-400 leading-relaxed mb-0.5">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
  });
}

function buildWelcomeMessage(docCount: number, listing: ActiveListing | null): Message {
  const listingText = listing
    ? `I've loaded the active listing: **"${listing.title}"** (${listing.matchScore}% match score).`
    : 'No job listing is selected. Go to **RADAR** and select a job to analyze.';
  return {
    id: 'msg-001',
    role: 'assistant',
    content: `**AI BRAIN activated.** I'm connected to Google Gemini and ready to analyze job listings against your profile.\n\n${listingText}\n\n${docCount > 0 ? `I have access to **${docCount} document${docCount > 1 ? 's' : ''}** from your Vault. Toggle documents in the panel to include or exclude them from context.` : 'No Vault documents are loaded yet. Upload documents in the **Vault** section and select them here for richer analysis.'}\n\nWhat would you like me to analyze? Use the quick prompts below or ask me anything specific.`,
    timestamp: '',
  };
}

export default function AIBrainContent() {
  const [vaultDocs, setVaultDocs] = useState<VaultDoc[]>([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<ChatAnalysis[]>([]);
  const [showAnalysesPanel, setShowAnalysesPanel] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  // RADAR job listings for selection
  const [radarJobs, setRadarJobs] = useState<JobListing[]>([]);
  const [radarLoading, setRadarLoading] = useState(true);
  const [activeListing, setActiveListing] = useState<ActiveListing | null>(null);
  const [showJobPicker, setShowJobPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const lastUserPromptRef = useRef<string>('');
  // Use a ref for selectedDocs to avoid stale closure in auto-save
  const selectedDocsRef = useRef<VaultDoc[]>([]);
  const activeListingRef = useRef<ActiveListing | null>(null);

  const { response, isLoading, error, sendMessage: sendGeminiMessage, abort } = useChat(
    'GEMINI',
    'gemini/gemini-2.5-flash',
    true
  );

  // Load vault documents from Supabase
  const loadVaultDocs = useCallback(async () => {
    try {
      setVaultLoading(true);
      setVaultError(null);
      const data = await vaultDocumentsService.getAll();
      setVaultDocs(
        data.map((doc, idx) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          selected: idx < 2 || doc.type === 'CV' || doc.type === 'Portfolio',
          storagePath: doc.storagePath,
          tags: doc.tags,
        }))
      );
    } catch (err: any) {
      setVaultError(err.message || 'Failed to load vault documents');
    } finally {
      setVaultLoading(false);
    }
  }, []);

  // Load RADAR job listings
  const loadRadarJobs = useCallback(async () => {
    try {
      setRadarLoading(true);
      const data = await jobListingsService.getAll();
      setRadarJobs(data);
      // Auto-select the first non-archived job
      const first = data.find((j) => j.status !== 'archived') ?? data[0] ?? null;
      if (first) {
        const listing: ActiveListing = {
          id: first.id,
          title: first.title,
          budget: first.budget,
          matchScore: first.matchScore,
          skills: first.skills,
        };
        setActiveListing(listing);
        activeListingRef.current = listing;
      }
    } catch {
      // silently fail — RADAR jobs are non-critical for AI BRAIN
    } finally {
      setRadarLoading(false);
    }
  }, []);

  // Load saved analyses
  const loadSavedAnalyses = useCallback(async () => {
    try {
      const data = await chatAnalysesService.getAll();
      setSavedAnalyses(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadVaultDocs();
    loadRadarJobs();
    loadSavedAnalyses();
  }, [loadVaultDocs, loadRadarJobs, loadSavedAnalyses]);

  // Keep selectedDocsRef in sync with state
  useEffect(() => {
    selectedDocsRef.current = vaultDocs.filter((d) => d.selected);
  }, [vaultDocs]);

  // Keep activeListingRef in sync with state
  useEffect(() => {
    activeListingRef.current = activeListing;
  }, [activeListing]);

  // Set welcome message once vault docs and radar jobs are loaded
  useEffect(() => {
    if (!vaultLoading && !radarLoading) {
      const selectedCount = vaultDocs.filter((d) => d.selected).length;
      const welcome = buildWelcomeMessage(selectedCount, activeListing);
      const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      setMessages([{ ...welcome, timestamp: ts }]);
    }
  }, [vaultLoading, radarLoading]);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  // Handle streaming response — update the assistant message in real-time
  useEffect(() => {
    if (!streamingMsgIdRef.current) return;
    if (response) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMsgIdRef.current ? { ...m, content: response } : m
        )
      );
    }
  }, [response]);

  // When streaming finishes, finalize the message and auto-save
  // Uses refs to avoid stale closure bugs with selectedDocs and activeListing
  useEffect(() => {
    if (!isLoading && streamingMsgIdRef.current && response) {
      const finalContent = response;
      const savedPrompt = lastUserPromptRef.current;
      // Read from refs — always current values, no stale closure
      const currentDocs = selectedDocsRef.current;
      const currentListing = activeListingRef.current;
      streamingMsgIdRef.current = null;
      setConversationHistory((prev) => [
        ...prev,
        { role: 'assistant', content: finalContent },
      ]);

      // Auto-save analysis to Supabase
      if (savedPrompt && finalContent) {
        setSavingAnalysis(true);
        const title = savedPrompt.length > 60 ? savedPrompt.slice(0, 57) + '...' : savedPrompt;
        chatAnalysesService.save({
          title,
          prompt: savedPrompt,
          response: finalContent,
          jobTitle: currentListing?.title ?? 'No listing selected',
          jobBudget: currentListing?.budget ?? '',
          jobMatchScore: currentListing?.matchScore ?? 0,
          jobSkills: currentListing?.skills ?? [],
          vaultDocIds: currentDocs.map((d) => d.id),
          vaultDocNames: currentDocs.map((d) => d.name),
        }).then((saved) => {
          if (saved) {
            setSavedAnalyses((prev) => [saved, ...prev]);
          }
        }).catch(() => {
          // silently fail
        }).finally(() => {
          setSavingAnalysis(false);
        });
      }
    }
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedDocs = vaultDocs.filter((d) => d.selected);

  const sendMessage = (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    lastUserPromptRef.current = messageText;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp,
    };

    const assistantMsgId = `msg-ai-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };

    streamingMsgIdRef.current = assistantMsgId;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');

    const updatedHistory = [...conversationHistory, { role: 'user', content: messageText }];
    setConversationHistory(updatedHistory);

    const systemPrompt = buildSystemPrompt(selectedDocs, activeListing);
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...updatedHistory,
    ];

    sendGeminiMessage(apiMessages, { temperature: 0.7, max_tokens: 2048 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const clearChat = () => {
    const selectedCount = vaultDocs.filter((d) => d.selected).length;
    const welcome = buildWelcomeMessage(selectedCount, activeListing);
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setMessages([{ ...welcome, timestamp: ts }]);
    setConversationHistory([]);
    streamingMsgIdRef.current = null;
    toast.success('Chat cleared');
  };

  const toggleDoc = (id: string) => {
    setVaultDocs((prev) => prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  };

  const selectAllDocs = () => {
    setVaultDocs((prev) => prev.map((d) => ({ ...d, selected: true })));
    toast.success('All documents added to context');
  };

  const clearAllDocs = () => {
    setVaultDocs((prev) => prev.map((d) => ({ ...d, selected: false })));
  };

  const selectJob = (job: JobListing) => {
    const listing: ActiveListing = {
      id: job.id,
      title: job.title,
      budget: job.budget,
      matchScore: job.matchScore,
      skills: job.skills,
    };
    setActiveListing(listing);
    activeListingRef.current = listing;
    setShowJobPicker(false);
    toast.success(`Switched to: ${job.title}`);
  };

  const saveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      toast.error('Please enter a valid API key');
      return;
    }
    setSavingKey(true);
    try {
      const res = await fetch('/api/settings/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      if (!res.ok) throw new Error('Failed to save key');
      toast.success('Gemini API key saved to your account');
      setShowApiKeyModal(false);
      setApiKeyInput('');
    } catch {
      toast.error('Failed to save API key. Please try again.');
    } finally {
      setSavingKey(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      await chatAnalysesService.delete(id);
      setSavedAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Analysis deleted');
    } catch {
      toast.error('Failed to delete analysis');
    }
  };

  const restoreAnalysis = (analysis: ChatAnalysis) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const userMsg: Message = {
      id: `msg-restored-user-${analysis.id}`,
      role: 'user',
      content: analysis.prompt,
      timestamp: ts,
    };
    const assistantMsg: Message = {
      id: `msg-restored-ai-${analysis.id}`,
      role: 'assistant',
      content: analysis.response,
      timestamp: ts,
    };
    setMessages([buildWelcomeMessage(selectedDocs.length, activeListing), userMsg, assistantMsg].map((m) =>
      m.timestamp ? m : { ...m, timestamp: ts }
    ));
    setConversationHistory([
      { role: 'user', content: analysis.prompt },
      { role: 'assistant', content: analysis.response },
    ]);
    setShowAnalysesPanel(false);
    toast.success('Analysis restored to chat');
  };

  return (
    <div className="flex h-full">
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-400/15 flex items-center justify-center">
                  <Key size={15} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-600 text-zinc-100">Gemini API Key</p>
                  <p className="text-[10px] text-zinc-500">Saved securely to your account</p>
                </div>
              </div>
              <button
                onClick={() => { setShowApiKeyModal(false); setApiKeyInput(''); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveApiKey(); }}
                  placeholder="AIza..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/10 transition-all font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">
                Get your key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowApiKeyModal(false); setApiKeyInput(''); }}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                disabled={!apiKeyInput.trim() || savingKey}
                className="flex-1 px-4 py-2 bg-teal-400 text-zinc-900 text-sm font-600 rounded-lg hover:bg-teal-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {savingKey ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Picker Modal */}
      {showJobPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-lg mx-4 shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-teal-400" />
                <p className="text-sm font-600 text-zinc-100">Select Active Listing</p>
              </div>
              <button onClick={() => setShowJobPicker(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {radarLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 size={14} className="text-teal-400 animate-spin" />
                  <span className="text-xs text-zinc-500">Loading jobs...</span>
                </div>
              ) : radarJobs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-zinc-500">No jobs in RADAR yet.</p>
                  <a href="/radar" className="text-xs text-teal-400 hover:text-teal-300 mt-1 block">Go to RADAR →</a>
                </div>
              ) : (
                radarJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => selectJob(job)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      activeListing?.id === job.id
                        ? 'bg-teal-400/10 border-teal-400/30' :'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-600 text-zinc-200 leading-snug line-clamp-2 flex-1">{job.title}</p>
                      <span className={`flex-shrink-0 font-mono text-xs font-700 ${job.matchScore >= 85 ? 'text-emerald-400' : job.matchScore >= 70 ? 'text-teal-400' : 'text-amber-400'}`}>
                        {job.matchScore}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">{job.budget}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Analyses Panel (slide-over) */}
      {showAnalysesPanel && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowAnalysesPanel(false)} />
          <div className="w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive size={15} className="text-teal-400" />
                <p className="text-sm font-600 text-zinc-100">Saved Analyses</p>
                <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-mono rounded">
                  {savedAnalyses.length}
                </span>
              </div>
              <button
                onClick={() => setShowAnalysesPanel(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {savedAnalyses.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Archive size={20} className="text-zinc-700" />
                  <p className="text-xs text-zinc-600 text-center">No analyses saved yet.<br />Analyses are saved automatically after each Gemini response.</p>
                </div>
              ) : (
                savedAnalyses.map((analysis) => (
                  <div key={analysis.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 group">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs font-600 text-zinc-200 leading-snug line-clamp-2 flex-1">{analysis.title}</p>
                      <button
                        onClick={() => deleteAnalysis(analysis.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-zinc-600 hover:text-red-400"
                        title="Delete analysis"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 mb-2">
                      {new Date(analysis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-500 text-[9px] rounded truncate max-w-[140px]">{analysis.jobTitle}</span>
                      {analysis.vaultDocNames.slice(0, 2).map((name, i) => (
                        <span key={`vd-${i}`} className="px-1.5 py-0.5 bg-teal-400/10 text-teal-600 text-[9px] rounded truncate max-w-[100px]">{name}</span>
                      ))}
                      {analysis.vaultDocNames.length > 2 && (
                        <span className="text-[9px] text-zinc-600">+{analysis.vaultDocNames.length - 2}</span>
                      )}
                    </div>
                    <button
                      onClick={() => restoreAnalysis(analysis)}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-zinc-700/50 hover:bg-teal-400/10 border border-zinc-700 hover:border-teal-400/30 text-zinc-500 hover:text-teal-400 text-[10px] rounded-md transition-all"
                    >
                      <RotateCcw size={10} />
                      Restore to chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left context panel */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Header */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-teal-400/15 flex items-center justify-center">
              <Brain size={15} className="text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-600 text-zinc-100">AI BRAIN</p>
              <p className="text-[10px] font-mono text-zinc-600">Gemini 2.5 Flash · Active</p>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-teal-400 animate-pulse-teal" />
            <button
              onClick={() => setShowApiKeyModal(true)}
              title="Update Gemini API Key"
              className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-teal-400 hover:bg-teal-400/10 transition-colors"
            >
              <Key size={13} />
            </button>
          </div>
        </div>

        {/* Active listing — now from RADAR */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mb-2">Active Listing</p>
          <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50">
            {activeListing ? (
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-600 text-zinc-200 leading-snug line-clamp-2">{activeListing.title}</p>
                  <span className="flex-shrink-0 font-mono-data text-xs font-700 text-emerald-400">{activeListing.matchScore}</span>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mb-2">{activeListing.budget}</p>
                <div className="flex flex-wrap gap-1">
                  {activeListing.skills.slice(0, 3).map((s) => (
                    <span key={`ctx-skill-${s}`} className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-500 text-[9px] rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-zinc-600 text-center py-1">No listing selected</p>
            )}
            <button
              onClick={() => setShowJobPicker(true)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 hover:text-teal-400 transition-colors"
            >
              <Radio size={10} />
              {activeListing ? 'Change listing' : 'Select from RADAR'}
            </button>
          </div>
        </div>

        {/* Vault context */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Vault Context</p>
            <div className="flex items-center gap-1.5">
              {vaultDocs.length > 0 && (
                <>
                  <button onClick={selectAllDocs} title="Select all documents" className="text-[10px] text-zinc-600 hover:text-teal-400 transition-colors">All</button>
                  <span className="text-zinc-700 text-[10px]">·</span>
                  <button onClick={clearAllDocs} title="Deselect all documents" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">None</button>
                  <span className="text-zinc-700 text-[10px]">·</span>
                </>
              )}
              <button onClick={loadVaultDocs} title="Refresh vault documents" className="text-zinc-600 hover:text-teal-400 transition-colors">
                <RefreshCw size={10} />
              </button>
            </div>
          </div>

          {vaultLoading && (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 size={12} className="text-teal-400 animate-spin" />
              <span className="text-[10px] text-zinc-600">Loading vault...</span>
            </div>
          )}

          {!vaultLoading && vaultError && (
            <div className="flex flex-col items-center gap-2 py-4">
              <AlertCircle size={14} className="text-red-400" />
              <p className="text-[10px] text-zinc-600 text-center">{vaultError}</p>
              <button onClick={loadVaultDocs} className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors">Retry</button>
            </div>
          )}

          {!vaultLoading && !vaultError && vaultDocs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4">
              <FileText size={14} className="text-zinc-700" />
              <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                No documents in Vault.<br />
                <a href="/vault" className="text-teal-400 hover:text-teal-300">Upload files</a> to use as context.
              </p>
            </div>
          )}

          {!vaultLoading && !vaultError && vaultDocs.length > 0 && (
            <div className="space-y-1.5">
              {vaultDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150 border ${
                    doc.selected
                      ? 'bg-teal-400/8 border-teal-400/20 text-teal-400' :'bg-zinc-800/30 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                  }`}
                >
                  {doc.selected ? (
                    <CheckCircle2 size={12} className="text-teal-400 flex-shrink-0" />
                  ) : (
                    <FileText size={12} className="flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium truncate">{doc.name}</p>
                    <p className="text-[9px] text-zinc-600">{doc.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600">
              <span className="font-mono text-teal-400">{selectedDocs.length}</span>
              {' '}of{' '}
              <span className="font-mono text-zinc-500">{vaultDocs.length}</span>
              {' '}documents in context
            </p>
          </div>
        </div>

        {/* Session info */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-600">
              <span className="text-zinc-400">{messages.length}</span> messages
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalysesPanel(true)}
                className="text-[10px] text-zinc-600 hover:text-teal-400 flex items-center gap-1 transition-colors"
                title="View saved analyses"
              >
                <Archive size={10} />
                {savedAnalyses.length > 0 && <span className="font-mono text-teal-400">{savedAnalyses.length}</span>}
              </button>
              <button
                onClick={clearChat}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={10} />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-zinc-500" />
            <span className="text-sm font-600 text-zinc-300">Analysis Session</span>
            <span className="px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-mono rounded-full">
              Gemini 2.5 Flash
            </span>
          </div>
          <div className="flex items-center gap-3">
            {selectedDocs.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-400/8 border border-teal-400/15 rounded-lg">
                <FileText size={10} className="text-teal-400" />
                <span className="text-[10px] font-mono text-teal-400">{selectedDocs.length} doc{selectedDocs.length > 1 ? 's' : ''} loaded</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              {savingAnalysis ? (
                <>
                  <Loader2 size={12} className="animate-spin text-teal-400" />
                  <span className="text-teal-400">Saving...</span>
                </>
              ) : (
                <>
                  <Archive size={12} />
                  <span>Auto-saved to Supabase</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === 'assistant' ?'bg-teal-400/15 border border-teal-400/20' :'bg-zinc-700 border border-zinc-600'
              }`}>
                {msg.role === 'assistant' ? (
                  <Sparkles size={13} className="text-teal-400" />
                ) : (
                  <User size={13} className="text-zinc-300" />
                )}
              </div>

              <div className={`max-w-[75%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-xl px-4 py-3 ${
                  msg.role === 'assistant' ?'bg-zinc-900 border border-zinc-800' :'bg-teal-400/10 border border-teal-400/20'
                }`}>
                  <div className={`text-xs leading-relaxed ${msg.role === 'user' ? 'text-teal-100' : 'text-zinc-300'}`}>
                    {msg.role === 'assistant' ? (
                      msg.content ? formatMessage(msg.content) : (
                        <div className="flex items-center gap-2">
                          <Loader2 size={12} className="text-teal-400 animate-spin" />
                          <span className="text-zinc-500 font-mono">Gemini is analyzing...</span>
                        </div>
                      )
                    ) : msg.content}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-mono text-zinc-700">{msg.timestamp}</span>
                  {msg.role === 'assistant' && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy message"
                    >
                      <Copy size={10} className="text-zinc-600 hover:text-zinc-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-6 py-2 border-t border-zinc-800/50 flex items-center gap-2 overflow-x-auto">
          <Zap size={12} className="text-zinc-600 flex-shrink-0" />
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.id}
              onClick={() => sendMessage(qp.prompt)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-xs rounded-lg hover:border-teal-400/30 hover:text-teal-400 hover:bg-teal-400/5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-teal-400/40 focus-within:ring-1 focus-within:ring-teal-400/10 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI BRAIN to analyze this listing, draft a proposal, or assess risks..."
              rows={3}
              className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-[10px] font-mono text-zinc-700">⏎ Send · Shift+⏎ New line</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { abort(); streamingMsgIdRef.current = null; }}
                  disabled={!isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-xs font-600 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-800 disabled:hover:border-zinc-700 disabled:hover:text-zinc-400"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400 text-zinc-900 rounded-lg text-xs font-600 hover:bg-teal-300 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-400"
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}