'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Upload, FileText, Trash2, Brain, Eye, Download, MoreHorizontal, FolderOpen, Clock, HardDrive, Tag, Plus, Loader2, AlertCircle, Briefcase, FileDown } from 'lucide-react';

import { vaultDocumentsService, type VaultDocument } from '@/lib/services/cockpitService';
import PortfolioSection, { PORTFOLIO_PROJECTS, type Project } from './PortfolioSection';
import CVGeneratorModal from './CVGeneratorModal';

const TYPE_CONFIG: Record<VaultDocument['type'], { color: string; bg: string }> = {
  CV: { color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20' },
  Portfolio: { color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
  'Case Study': { color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  'Cover Letter': { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  Template: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  Contract: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  Skills: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
};

type VaultTab = 'documents' | 'portfolio';

export default function VaultContent() {
  const [activeTab, setActiveTab] = useState<VaultTab>('documents');
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvSelectedProjects, setCvSelectedProjects] = useState<Project[]>([]);
  const [cvJobText, setCvJobText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await vaultDocumentsService.getAll();
      setDocuments(data);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filtered = documents.filter((d) => {
    const matchSearch =
      search === '' ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'all' || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalSize = documents.reduce((acc, d) => acc + d.sizeBytes, 0);

  function formatBytes(bytes: number): string {
    if (bytes < 1000000) return `${(bytes / 1000).toFixed(0)} KB`;
    return `${(bytes / 1000000).toFixed(1)} MB`;
  }

  const handleUpload = useCallback(async (fileName: string, fileSize: number) => {
    setUploading(true);
    setUploadProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 80));
      setUploadProgress(i);
    }
    try {
      const newDoc = await vaultDocumentsService.create({ name: fileName, sizeBytes: fileSize });
      if (newDoc) {
        setDocuments((prev) => [newDoc, ...prev]);
        toast.success(`"${fileName}" uploaded to Vault`);
      }
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUpload(files[0].name, files[0].size);
  }, [handleUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleUpload(files[0].name, files[0].size);
  };

  const deleteDocument = async (id: string, name: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setOpenMenuId(null);
    try {
      await vaultDocumentsService.delete(id);
      toast.success(`"${name}" deleted from Vault`);
    } catch {
      toast.error('Failed to delete document');
      loadDocuments();
    }
  };

  const sendToAIBrain = (name: string) => {
    setOpenMenuId(null);
    toast.success(`"${name}" added to AI BRAIN context`, {
      action: { label: 'Open', onClick: () => window.location.href = '/ai-brain' },
    });
  };

  const handleGenerateCV = (projects: Project[], jobText: string) => {
    setCvSelectedProjects(projects);
    setCvJobText(jobText);
    setCvModalOpen(true);
  };

  const types = Array.from(new Set(documents.map((d) => d.type)));

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-teal-400 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm">Loading vault documents...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <AlertCircle size={32} className="text-red-400 mb-4" />
        <p className="text-zinc-400 font-medium">Failed to load documents</p>
        <p className="text-zinc-600 text-sm mt-1">{loadError}</p>
        <button
          onClick={loadDocuments}
          className="mt-4 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'vs-total', label: 'Total Documents', value: documents.length.toString(), icon: FileText, color: 'text-teal-400', bg: 'bg-teal-400/10' },
          { id: 'vs-size', label: 'Total Size', value: formatBytes(totalSize), icon: HardDrive, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { id: 'vs-usage', label: 'Total Uses in AI', value: documents.reduce((a, d) => a + d.usageCount, 0).toString(), icon: Brain, color: 'text-violet-400', bg: 'bg-violet-400/10' },
        ].map((s) => {
          const StatIcon = s.icon;
          return (
            <div key={s.id} className="cockpit-card p-4 flex items-center gap-3">
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

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
            activeTab === 'documents'
              ? 'bg-zinc-800 text-zinc-200 shadow-sm' :'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText size={13} />
          Documents
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
            activeTab === 'portfolio' ?'bg-zinc-800 text-zinc-200 shadow-sm' :'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Briefcase size={13} />
          Portfolio
          <span className="px-1.5 py-0.5 bg-teal-400/15 text-teal-400 text-[9px] rounded font-mono">
            {PORTFOLIO_PROJECTS.length}
          </span>
        </button>
        <button
          onClick={() => { setCvSelectedProjects([]); setCvJobText(''); setCvModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-all duration-150"
        >
          <FileDown size={13} />
          CV Generator
        </button>
      </div>

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <>
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-teal-400/60 bg-teal-400/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <Loader2 size={20} className="text-teal-400 animate-spin" />
                <p className="text-sm text-zinc-400">Uploading to Vault...</p>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs font-mono text-zinc-600">{uploadProgress}%</p>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <Upload size={18} className={dragOver ? 'text-teal-400' : 'text-zinc-500'} />
                </div>
                <p className="text-sm font-medium text-zinc-400">
                  {dragOver ? 'Drop to upload' : 'Drop files here or click to upload'}
                </p>
                <p className="text-xs text-zinc-600">PDF, DOC, DOCX, TXT · Max 20 MB per file</p>
              </>
            )}
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search documents and tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', ...types] as string[]).map((t) => (
                <button
                  key={`vf-${t}`}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    typeFilter === t
                      ? 'bg-teal-400/15 border-teal-400/30 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono text-zinc-600 ml-auto">
              {filtered.length} documents
            </span>
          </div>

          {/* Document grid */}
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <FolderOpen size={40} className="text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">No documents found</p>
              <p className="text-zinc-600 text-sm mt-1">Upload your CV, portfolio, or case studies to get started</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-400/20 transition-all"
              >
                <Plus size={14} />
                Upload Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 pb-6">
              {filtered.map((doc) => {
                const TYPE_CONFIG: Record<VaultDocument['type'], { color: string; bg: string }> = {
                  CV: { color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20' },
                  Portfolio: { color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
                  'Case Study': { color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
                  'Cover Letter': { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
                  Template: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                  Contract: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
                  Skills: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                };
                const typeConf = TYPE_CONFIG[doc.type];
                const isMenuOpen = openMenuId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="cockpit-card cockpit-card-hover p-4 flex flex-col gap-3 relative group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className={typeConf.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-600 text-zinc-200 truncate leading-snug" title={doc.name}>
                          {doc.name}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border mt-1 ${typeConf.bg} ${typeConf.color}`}>
                          {doc.type}
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : doc.id)}
                          className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-20 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 w-44 animate-fade-in">
                            <button
                              onClick={() => { toast.success('Preview opened'); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                            >
                              <Eye size={12} />
                              Preview
                            </button>
                            <button
                              onClick={() => sendToAIBrain(doc.name)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-teal-400 hover:bg-zinc-700 transition-colors"
                            >
                              <Brain size={12} />
                              Send to AI BRAIN
                            </button>
                            <button
                              onClick={() => { toast.success('Download started'); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                            >
                              <Download size={12} />
                              Download
                            </button>
                            <hr className="border-zinc-700 my-1" />
                            <button
                              onClick={() => deleteDocument(doc.id, doc.name)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-700 transition-colors"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <span key={`${doc.id}-tag-${tag}`} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[9px] rounded">
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wide">Size</p>
                        <p className="text-xs font-mono-data text-zinc-400">{doc.size}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wide">AI Uses</p>
                        <p className="text-xs font-mono-data text-zinc-400">{doc.usageCount}×</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wide">Uploaded</p>
                        <p className="text-xs text-zinc-500">{doc.uploadedAt}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wide">Last Used</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock size={9} />
                          {doc.lastUsed}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => sendToAIBrain(doc.name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-[10px] font-medium hover:bg-teal-400/20 transition-all"
                      >
                        <Brain size={11} />
                        AI BRAIN
                      </button>
                      <button
                        onClick={() => toast.success('Preview opened')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-[10px] font-medium hover:border-zinc-600 hover:text-zinc-300 transition-all"
                      >
                        <Eye size={11} />
                        Preview
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Portfolio tab */}
      {activeTab === 'portfolio' && (
        <PortfolioSection onGenerateCV={handleGenerateCV} />
      )}

      {/* CV Generator Modal */}
      <CVGeneratorModal
        isOpen={cvModalOpen}
        onClose={() => setCvModalOpen(false)}
        selectedProjects={cvSelectedProjects.length > 0 ? cvSelectedProjects : PORTFOLIO_PROJECTS.slice(0, 3)}
        jobText={cvJobText}
      />
    </div>
  );
}