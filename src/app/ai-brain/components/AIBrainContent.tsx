'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Brain, Send, Sparkles, FileText, Copy, RotateCcw, Loader2, Plus, CheckCircle2, Radio, Archive, MessageSquare, Zap, User, Key, X, Eye, EyeOff } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';

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
}

interface ActiveListing {
  id: string;
  title: string;
  budget: string;
  matchScore: number;
  skills: string[];
}

const VAULT_DOCS: VaultDoc[] = [
  { id: 'doc-001', name: 'Marko_Novak_CV_2026.pdf', type: 'CV', selected: true },
  { id: 'doc-002', name: 'Portfolio_Case_Studies.pdf', type: 'Portfolio', selected: true },
  { id: 'doc-003', name: 'FinTech_Dashboard_Case.pdf', type: 'Case Study', selected: false },
  { id: 'doc-004', name: 'React_Skills_Summary.pdf', type: 'Skills', selected: false },
  { id: 'doc-005', name: 'Cover_Letter_Template.docx', type: 'Template', selected: false },
];

const ACTIVE_LISTING: ActiveListing = {
  id: 'job-001',
  title: 'Senior React Developer for FinTech Dashboard Redesign',
  budget: '$3,500–$6,000',
  matchScore: 94,
  skills: ['React', 'TypeScript', 'Tailwind CSS', 'REST API', 'Figma'],
};

const QUICK_PROMPTS = [
  { id: 'qp-analyze', label: 'Analyze Match', prompt: 'Analyze my fit for this job listing based on my CV and portfolio. Give me a detailed match breakdown.' },
  { id: 'qp-proposal', label: 'Draft Proposal', prompt: "Write a compelling proposal for this job listing tailored to the client\'s requirements and my experience." },
  { id: 'qp-questions', label: 'Clarifying Questions', prompt: 'What clarifying questions should I ask the client before submitting a proposal?' },
  { id: 'qp-rate', label: 'Rate Advice', prompt: 'Based on the budget range and my experience level, what rate should I bid? Justify your recommendation.' },
  { id: 'qp-risks', label: 'Project Risks', prompt: 'What are the potential red flags or risks in this job listing I should be aware of?' },
];

const WELCOME_MESSAGE: Message = {
  id: 'msg-001',
  role: 'assistant',
  content: `**AI BRAIN activated.** I'm connected to Google Gemini and ready to analyze job listings against your profile.\n\nI've loaded the active listing: **"Senior React Developer for FinTech Dashboard Redesign"** (94% match score).\n\nI have access to your **CV** and **Portfolio Case Studies** from your Vault. Select additional documents above to include more context.\n\nWhat would you like me to analyze? Use the quick prompts below or ask me anything specific.`,
  timestamp: '',
};

function buildSystemPrompt(selectedDocs: VaultDoc[], listing: ActiveListing): string {
  const docList = selectedDocs.map((d) => `- ${d.name} (${d.type})`).join('\n');
  return `You are AI BRAIN, an expert freelance career advisor and proposal strategist integrated into a freelancer's cockpit application.

## Active Job Listing
Title: ${listing.title}
Budget: ${listing.budget}
Match Score: ${listing.matchScore}/100
Required Skills: ${listing.skills.join(', ')}

## Vault Documents in Context
The following documents from the user's Vault are available as context:
${docList || 'No documents selected.'}

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
- When analyzing match, provide specific evidence from the user's background`;
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

export default function AIBrainContent() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [vaultDocs, setVaultDocs] = useState(VAULT_DOCS);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  // Track conversation history for multi-turn (excluding welcome message)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Track if we've already added the streaming response to messages
  const streamingMsgIdRef = useRef<string | null>(null);

  const { response, isLoading, error, sendMessage: sendGeminiMessage, abort } = useChat(
    'GEMINI',
    'gemini/gemini-2.5-flash',
    true
  );

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  // Set welcome message timestamp on client only to avoid hydration mismatch
  useEffect(() => {
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setMessages((prev) =>
      prev.map((m) => (m.id === 'msg-001' && m.timestamp === '' ? { ...m, timestamp: ts } : m))
    );
  }, []);

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

  // When streaming finishes, finalize the message and update conversation history
  useEffect(() => {
    if (!isLoading && streamingMsgIdRef.current && response) {
      const finalContent = response;
      const msgId = streamingMsgIdRef.current;
      streamingMsgIdRef.current = null;
      setConversationHistory((prev) => [
        ...prev,
        { role: 'assistant', content: finalContent },
      ]);
    }
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedDocs = vaultDocs.filter((d) => d.selected);

  const sendMessage = (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp,
    };

    // Placeholder assistant message for streaming
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

    // Update conversation history with the new user message
    const updatedHistory = [...conversationHistory, { role: 'user', content: messageText }];
    setConversationHistory(updatedHistory);

    // Build messages array for Gemini: system + full conversation history
    const systemPrompt = buildSystemPrompt(selectedDocs, ACTIVE_LISTING);
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
    setMessages([WELCOME_MESSAGE]);
    setConversationHistory([]);
    streamingMsgIdRef.current = null;
    toast.success('Chat cleared');
  };

  const toggleDoc = (id: string) => {
    setVaultDocs((prev) => prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
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
      toast.success('Gemini API key updated successfully');
      setShowApiKeyModal(false);
      setApiKeyInput('');
    } catch {
      toast.error('Failed to save API key. Please try again.');
    } finally {
      setSavingKey(false);
    }
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
                  <p className="text-[10px] text-zinc-500">Update your Google Gemini API key</p>
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

        {/* Active listing */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mb-2">Active Listing</p>
          <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-600 text-zinc-200 leading-snug line-clamp-2">{ACTIVE_LISTING.title}</p>
              <span className="flex-shrink-0 font-mono-data text-xs font-700 text-emerald-400">{ACTIVE_LISTING.matchScore}</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mb-2">{ACTIVE_LISTING.budget}</p>
            <div className="flex flex-wrap gap-1">
              {ACTIVE_LISTING.skills.slice(0, 3).map((s) => (
                <span key={`ctx-skill-${s}`} className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-500 text-[9px] rounded">
                  {s}
                </span>
              ))}
            </div>
            <button className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
              <Radio size={10} />
              Change listing
            </button>
          </div>
        </div>

        {/* Vault context */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Vault Context</p>
            <button
              onClick={() => setShowVaultPicker(!showVaultPicker)}
              className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-0.5 transition-colors"
            >
              <Plus size={10} />
              Add
            </button>
          </div>

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

          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600">
              <span className="font-mono text-teal-400">{selectedDocs.length}</span> documents in context
            </p>
          </div>
        </div>

        {/* Session info */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-600">
              <span className="text-zinc-400">{messages.length}</span> messages
            </span>
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
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Archive size={12} />
            <span>Session auto-saved</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === 'assistant' ?'bg-teal-400/15 border border-teal-400/20' :'bg-zinc-700 border border-zinc-600'
              }`}>
                {msg.role === 'assistant' ? (
                  <Sparkles size={13} className="text-teal-400" />
                ) : (
                  <User size={13} className="text-zinc-300" />
                )}
              </div>

              {/* Bubble */}
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
                  onClick={() => {
                    abort();
                    streamingMsgIdRef.current = null;
                  }}
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