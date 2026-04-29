'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, CheckSquare, Upload, Plus, Trash2, Check, Circle, AlertTriangle, ArrowUp, ArrowDown, Minus, File, X, Clock, Bold, Italic, List, Hash, Loader2, FolderOpen, AlertCircle } from 'lucide-react';

import { tasksService, notesService, type Task, type Note } from '@/lib/services/cockpitService';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────
type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'in-progress' | 'done';

interface WorkFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  type: string;
}

const INITIAL_FILES: WorkFile[] = [
  { id: 'wf-001', name: 'fintech_wireframes_v2.fig', size: '3.4 MB', uploadedAt: 'Apr 11, 2026', type: 'Design' },
  { id: 'wf-002', name: 'proposal_draft_react_fintech.docx', size: '48 KB', uploadedAt: 'Apr 12, 2026', type: 'Document' },
  { id: 'wf-003', name: 'colabrate_milestone2_notes.txt', size: '12 KB', uploadedAt: 'Apr 10, 2026', type: 'Text' },
  { id: 'wf-004', name: 'rate_increase_planning.xlsx', size: '24 KB', uploadedAt: 'Apr 8, 2026', type: 'Spreadsheet' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: AlertTriangle },
  high: { label: 'High', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: ArrowUp },
  medium: { label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', icon: Minus },
  low: { label: 'Low', color: 'text-zinc-500', bg: 'bg-zinc-700/30 border-zinc-700', icon: ArrowDown },
};

export default function LaboratorijaContent() {
  const { user } = useAuth();
  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Files state (local only — workspace scratch files)
  const [files, setFiles] = useState<WorkFile[]>(INITIAL_FILES);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes
  useEffect(() => {
    (async () => {
      try {
        setNotesLoading(true);
        setNotesError(null);
        const data = await notesService.getAll();
        setNotes(data);
        if (data.length > 0) {
          setActiveNote(data[0]);
          setNoteTitle(data[0].title);
          setNoteContent(data[0].content);
        }
      } catch (err: any) {
        setNotesError(err.message || 'Failed to load notes');
      } finally {
        setNotesLoading(false);
      }
    })();
  }, []);

  // Load tasks
  useEffect(() => {
    (async () => {
      try {
        setTasksLoading(true);
        setTasksError(null);
        const data = await tasksService.getAll();
        setTasks(data);
      } catch (err: any) {
        setTasksError(err.message || 'Failed to load tasks');
      } finally {
        setTasksLoading(false);
      }
    })();
  }, []);

  // Autosave notes to Supabase
  useEffect(() => {
    if (saveStatus === 'saved' || !activeNote) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await notesService.update(activeNote.id, noteTitle, noteContent);
        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        setNotes((prev) =>
          prev.map((n) => (n.id === activeNote.id ? { ...n, title: noteTitle, content: noteContent, updatedAt: now } : n))
        );
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 1000);
  }, [noteTitle, noteContent]);

  const handleNoteChange = (field: 'title' | 'content', value: string) => {
    if (field === 'title') setNoteTitle(value);
    else setNoteContent(value);
    setSaveStatus('unsaved');
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setSaveStatus('saved');
  };

  const addNewNote = async () => {
    try {
      const newNote = await notesService.create();
      if (newNote) {
        setNotes((prev) => [newNote, ...prev]);
        selectNote(newNote);
      }
    } catch {
      toast.error('Failed to create note');
    }
  };

  // Tasks
  const addTask = async () => {
    if (!newTaskText.trim()) return;
    try {
      const newTask = await tasksService.create({ text: newTaskText.trim(), priority: newTaskPriority });
      if (newTask) {
        setTasks((prev) => [newTask, ...prev]);
        setNewTaskText('');
        toast.success('Task added');
      }
    } catch {
      toast.error('Failed to add task');
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next: TaskStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in-progress' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));
    try {
      await tasksService.updateStatus(id, next);

      // Fire Project Update email when task is marked done
      if (next === 'done' && user?.id) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        fetch(`${supabaseUrl}/functions/v1/send-submission-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            type: 'project_update',
            record: {
              user_id: user.id,
              task_text: task.text,
              priority: task.priority,
              project: task.project || 'Lab',
              completed_at: new Date().toISOString(),
            },
          }),
        }).catch(() => {
          // Non-blocking — silently ignore email failures
        });
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await tasksService.delete(id);
      toast.success('Task removed');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter((t) => taskFilter === 'all' || t.status === taskFilter);
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  // Files (local workspace scratch files)
  const simulateFileUpload = useCallback(async (name: string, size: string) => {
    setFileUploading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const newFile: WorkFile = {
      id: `wf-${Date.now()}`,
      name,
      size,
      uploadedAt: 'Apr 12, 2026',
      type: 'Document',
    };
    setFiles((prev) => [newFile, ...prev]);
    setFileUploading(false);
    toast.success(`"${name}" added to workspace`);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) simulateFileUpload(dropped[0].name, '1.0 MB');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) simulateFileUpload(picked[0].name, '1.0 MB');
  };

  const deleteFile = (id: string, name: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    toast.success(`"${name}" removed`);
  };

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-0 overflow-hidden">

      {/* ── NOTES PANEL ── */}
      <div className="xl:col-span-1 flex flex-col border-r border-zinc-800 overflow-hidden">
        {/* Note list sidebar */}
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-teal-400" />
            <span className="text-sm font-600 text-zinc-300">Notes</span>
            <span className="font-mono-data text-xs text-zinc-600">{notes.length}</span>
          </div>
          <button
            onClick={addNewNote}
            className="p-1.5 rounded-md bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 transition-all"
            title="New note"
            suppressHydrationWarning
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Note list */}
        <div className="flex flex-col border-b border-zinc-800" style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {notesLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={16} className="text-teal-400 animate-spin" />
            </div>
          ) : notesError ? (
            <div className="flex flex-col items-center py-4 px-4 gap-1">
              <AlertCircle size={14} className="text-red-400" />
              <p className="text-[10px] text-zinc-600 text-center">{notesError}</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center py-6 px-4">
              <p className="text-xs text-zinc-600">No notes yet</p>
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`text-left px-4 py-3 border-b border-zinc-800/50 transition-all duration-150 ${
                  activeNote?.id === note.id
                    ? 'bg-teal-400/5 border-l-2 border-l-teal-400' : 'hover:bg-zinc-800/50 border-l-2 border-l-transparent'
                }`}
                suppressHydrationWarning
              >
                <p className={`text-xs font-600 truncate ${activeNote?.id === note.id ? 'text-teal-400' : 'text-zinc-300'}`}>
                  {note.title || 'Untitled'}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1">
                  <Clock size={8} />
                  {note.updatedAt}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Note editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-1">
            {[
              { id: 'tb-bold', icon: Bold, title: 'Bold' },
              { id: 'tb-italic', icon: Italic, title: 'Italic' },
              { id: 'tb-list', icon: List, title: 'List' },
              { id: 'tb-h', icon: Hash, title: 'Heading' },
            ].map((btn) => {
              const BtnIcon = btn.icon;
              return (
                <button
                  key={btn.id}
                  title={btn.title}
                  className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                  suppressHydrationWarning
                >
                  <BtnIcon size={12} />
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                  <Loader2 size={9} className="animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-600">
                  <Check size={9} className="text-emerald-400" />
                  Saved
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="text-[10px] font-mono text-amber-400">Unsaved</span>
              )}
            </div>
          </div>

          {/* Title */}
          <input
            suppressHydrationWarning
            type="text"
            value={noteTitle}
            onChange={(e) => handleNoteChange('title', e.target.value)}
            placeholder="Note title..."
            disabled={!activeNote}
            className="px-4 pt-3 pb-1 bg-transparent text-sm font-600 text-zinc-200 placeholder:text-zinc-700 focus:outline-none border-b border-zinc-800/50 disabled:opacity-40"
          />

          {/* Content */}
          <textarea
            suppressHydrationWarning
            value={noteContent}
            onChange={(e) => handleNoteChange('content', e.target.value)}
            placeholder={activeNote ? 'Start writing...' : 'Select or create a note'}
            disabled={!activeNote}
            className="flex-1 px-4 py-3 bg-transparent text-xs text-zinc-400 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed font-mono disabled:opacity-40"
          />
        </div>
      </div>

      {/* ── TASKS PANEL ── */}
      <div className="xl:col-span-1 flex flex-col border-r border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} className="text-amber-400" />
            <span className="text-sm font-600 text-zinc-300">Tasks</span>
            <span className="font-mono-data text-xs text-zinc-600">{doneTasks}/{tasks.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-zinc-600">Completion</span>
            <span className="text-[10px] font-mono text-zinc-500">{tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Add task */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a task..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 transition-all"
              suppressHydrationWarning
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-400 focus:outline-none focus:border-amber-400/40 transition-all"
              suppressHydrationWarning
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={addTask}
              className="p-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg hover:bg-amber-400/20 transition-all active:scale-95"
              suppressHydrationWarning
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 py-2 border-b border-zinc-800 flex gap-2">
          {(['all', 'todo', 'in-progress', 'done'] as const).map((f) => (
            <button
              key={`tf-${f}`}
              onClick={() => setTaskFilter(f)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                taskFilter === f ? 'bg-amber-400/15 text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
              suppressHydrationWarning
            >
              {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto py-2">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="text-amber-400 animate-spin" />
            </div>
          ) : tasksError ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-xs text-zinc-600">{tasksError}</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <CheckSquare size={28} className="text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-600">No tasks in this view</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const pConf = PRIORITY_CONFIG[task.priority];
              const PIcon = pConf.icon;
              return (
                <div
                  key={task.id}
                  className={`group flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-all border-b border-zinc-800/30 ${
                    task.status === 'done' ? 'opacity-50' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 flex-shrink-0"
                    title="Toggle status"
                    suppressHydrationWarning
                  >
                    {task.status === 'done' ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center">
                        <Check size={9} className="text-emerald-400" />
                      </div>
                    ) : task.status === 'in-progress' ? (
                      <div className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      </div>
                    ) : (
                      <Circle size={16} className="text-zinc-700 hover:text-zinc-500 transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${task.status === 'done' ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                      {task.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${pConf.bg} ${pConf.color}`}>
                        <PIcon size={8} />
                        {pConf.label}
                      </span>
                      <span className="text-[9px] text-zinc-600">{task.project}</span>
                      <span className="text-[9px] font-mono text-zinc-700">{task.dueDate}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-700 hover:text-red-400 transition-all flex-shrink-0"
                    title="Delete task"
                    suppressHydrationWarning
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── FILES PANEL ── */}
      <div className="xl:col-span-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-violet-400" />
            <span className="text-sm font-600 text-zinc-300">Work Files</span>
            <span className="font-mono-data text-xs text-zinc-600">{files.length}</span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-md bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 transition-all"
            title="Upload file"
            suppressHydrationWarning
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setFileDragOver(true); }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => !fileUploading && fileInputRef.current?.click()}
          className={`mx-4 mt-4 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
            fileDragOver
              ? 'border-violet-400/60 bg-violet-400/5'
              : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            className="hidden"
          />
          {fileUploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 size={18} className="text-violet-400 animate-spin" />
              <p className="text-xs text-zinc-500">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload size={20} className={fileDragOver ? 'text-violet-400' : 'text-zinc-600'} />
              <p className="text-xs text-zinc-500 text-center">
                {fileDragOver ? 'Drop to add' : 'Drop work files here'}
              </p>
              <p className="text-[10px] text-zinc-700">Any file type · WIP assets</p>
            </>
          )}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <FolderOpen size={28} className="text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-600">No work files yet</p>
              <p className="text-[10px] text-zinc-700 mt-0.5">Upload WIP assets, wireframes, drafts</p>
            </div>
          ) : (
            files.map((f) => {
              const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
              const iconColor =
                ext === 'fig' ? 'text-violet-400' :
                ext === 'pdf' ? 'text-red-400' :
                ext === 'docx' || ext === 'doc' ? 'text-blue-400' :
                ext === 'xlsx' ? 'text-emerald-400' : 'text-zinc-500';

              return (
                <div
                  key={f.id}
                  className="group flex items-center gap-3 p-3 bg-zinc-800/40 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-800/70 transition-all duration-150"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <File size={15} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{f.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-zinc-600">{f.size}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[10px] text-zinc-600">{f.uploadedAt}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteFile(f.id, f.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-700 hover:text-red-400 transition-all flex-shrink-0"
                    title="Remove file"
                    suppressHydrationWarning
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}