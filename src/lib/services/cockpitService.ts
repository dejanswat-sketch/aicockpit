'use client';

import { createClient } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────

export interface JobListing {
  id: string;
  title: string;
  client: string;
  clientRating: number;
  clientSpend: string;
  budget: string;
  budgetType: 'fixed' | 'hourly';
  posted: string;
  skills: string[];
  description: string;
  proposals: number;
  matchScore: number;
  status: 'new' | 'reviewed' | 'proposal-sent' | 'shortlisted' | 'archived';
  saved: boolean;
  category: string;
}

export interface VaultDocument {
  id: string;
  name: string;
  type: 'CV' | 'Portfolio' | 'Case Study' | 'Cover Letter' | 'Template' | 'Contract' | 'Skills';
  size: string;
  sizeBytes: number;
  uploadedAt: string;
  usageCount: number;
  tags: string[];
  lastUsed: string;
  storagePath: string | null;
}

export interface Task {
  id: string;
  text: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'done';
  dueDate: string;
  project: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(0)} KB`;
  return `${(bytes / 1000000).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

function formatUploadedAt(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNoteTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function inferDocType(fileName: string): VaultDocument['type'] {
  const lower = fileName.toLowerCase();
  if (lower.includes('cv') || lower.includes('resume')) return 'CV';
  if (lower.includes('cover') || lower.includes('letter')) return 'Cover Letter';
  if (lower.includes('case') || lower.includes('study')) return 'Case Study';
  if (lower.includes('contract') || lower.includes('agreement')) return 'Contract';
  if (lower.includes('skill') || lower.includes('competenc')) return 'Skills';
  if (lower.includes('template')) return 'Template';
  return 'Portfolio';
}

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    return /relation.*does not exist|column.*does not exist|function.*does not exist|syntax error|type.*does not exist/i.test(error.message);
  }
  return false;
}

// ── Job Listings Service ───────────────────────────────────────────────

export const jobListingsService = {
  async getAll(): Promise<JobListing[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('job_listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        client: row.client,
        clientRating: row.client_rating,
        clientSpend: row.client_spend,
        budget: row.budget,
        budgetType: row.budget_type as 'fixed' | 'hourly',
        posted: row.posted,
        skills: row.skills || [],
        description: row.description,
        proposals: row.proposals,
        matchScore: row.match_score,
        status: row.job_status as JobListing['status'],
        saved: row.saved,
        category: row.category,
      }));
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async create(job: {
    title: string;
    client: string;
    clientRating?: number;
    clientSpend?: string;
    budget: string;
    budgetType: 'fixed' | 'hourly';
    skills: string[];
    description?: string;
    category?: string;
    matchScore?: number;
  }): Promise<JobListing | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('job_listings')
        .insert({
          user_id: user.id,
          title: job.title,
          client: job.client,
          client_rating: job.clientRating ?? 0,
          client_spend: job.clientSpend ?? '',
          budget: job.budget,
          budget_type: job.budgetType,
          posted: 'Just now',
          skills: job.skills,
          description: job.description ?? '',
          proposals: 0,
          match_score: job.matchScore ?? 0,
          job_status: 'new',
          saved: false,
          category: job.category ?? '',
        })
        .select()
        .single();

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        client: data.client,
        clientRating: data.client_rating,
        clientSpend: data.client_spend,
        budget: data.budget,
        budgetType: data.budget_type as 'fixed' | 'hourly',
        posted: data.posted,
        skills: data.skills || [],
        description: data.description,
        proposals: data.proposals,
        matchScore: data.match_score,
        status: data.job_status as JobListing['status'],
        saved: data.saved,
        category: data.category,
      };
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async toggleSave(id: string, saved: boolean): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('job_listings')
      .update({ saved })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },

  async updateStatus(id: string, status: JobListing['status']): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('job_listings')
      .update({ job_status: status })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('job_listings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },
};

// ── Vault Documents Service ────────────────────────────────────────────

export const vaultDocumentsService = {
  async getAll(): Promise<VaultDocument[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        type: row.doc_type as VaultDocument['type'],
        size: formatBytes(row.size_bytes),
        sizeBytes: row.size_bytes,
        uploadedAt: formatUploadedAt(row.uploaded_at),
        usageCount: row.usage_count,
        tags: row.tags || [],
        lastUsed: row.last_used_at ? formatRelativeTime(row.last_used_at) : 'Never',
        storagePath: row.storage_path ?? null,
      }));
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async upload(file: File, type?: VaultDocument['type']): Promise<VaultDocument | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Build a unique storage path: {userId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${timestamp}-${safeFileName}`;

    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('vault-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message);
      throw new Error(uploadError.message);
    }

    // 2. Infer doc type from file name if not provided
    const inferredType = type ?? inferDocType(file.name);

    // 3. Persist metadata in vault_documents table
    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .insert({
          user_id: user.id,
          name: file.name,
          doc_type: inferredType,
          size_bytes: file.size,
          tags: ['new'],
          usage_count: 0,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (error) {
        // Rollback storage upload on DB failure
        await supabase.storage.from('vault-documents').remove([storagePath]);
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.doc_type as VaultDocument['type'],
        size: formatBytes(data.size_bytes),
        sizeBytes: data.size_bytes,
        uploadedAt: formatUploadedAt(data.uploaded_at),
        usageCount: data.usage_count,
        tags: data.tags || [],
        lastUsed: 'Never',
        storagePath: data.storage_path ?? null,
      };
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async create(doc: { name: string; sizeBytes: number; type?: VaultDocument['type'] }): Promise<VaultDocument | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .insert({
          user_id: user.id,
          name: doc.name,
          doc_type: doc.type || 'Portfolio',
          size_bytes: doc.sizeBytes,
          tags: ['new'],
          usage_count: 0,
        })
        .select()
        .single();

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.doc_type as VaultDocument['type'],
        size: formatBytes(data.size_bytes),
        sizeBytes: data.size_bytes,
        uploadedAt: formatUploadedAt(data.uploaded_at),
        usageCount: data.usage_count,
        tags: data.tags || [],
        lastUsed: 'Never',
        storagePath: null,
      };
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('vault-documents')
      .createSignedUrl(storagePath, expiresIn);
    if (error) { console.error('Signed URL error:', error.message); return null; }
    return data.signedUrl;
  },

  async delete(id: string, storagePath?: string | null): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Delete DB record first
    const { error } = await supabase
      .from('vault_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }

    // Then remove from storage if a path exists
    if (storagePath) {
      await supabase.storage.from('vault-documents').remove([storagePath]);
    }
  },
};

// ── Tasks Service ──────────────────────────────────────────────────────

export const tasksService = {
  async getAll(): Promise<Task[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        text: row.text,
        priority: row.priority as Task['priority'],
        status: row.task_status as Task['status'],
        dueDate: row.due_date,
        project: row.project,
      }));
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async create(task: { text: string; priority: Task['priority']; dueDate?: string; project?: string }): Promise<Task | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          text: task.text,
          priority: task.priority,
          task_status: 'todo',
          due_date: task.dueDate ?? 'No date',
          project: task.project ?? 'General',
        })
        .select()
        .single();

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return null;
      }

      return {
        id: data.id,
        text: data.text,
        priority: data.priority as Task['priority'],
        status: data.task_status as Task['status'],
        dueDate: data.due_date,
        project: data.project,
      };
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async updateStatus(id: string, status: Task['status']): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('tasks')
      .update({ task_status: status })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },
};

// ── Notes Service ──────────────────────────────────────────────────────

export const notesService = {
  async getAll(): Promise<Note[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        updatedAt: formatNoteTime(row.updated_at),
      }));
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async create(note: { title: string; content: string }): Promise<Note | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: note.title,
          content: note.content,
        })
        .select()
        .single();

      if (error) {
        if (isSchemaError(error)) { console.error('Schema error:', error.message); throw error; }
        console.log('Data error:', error.message);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        updatedAt: formatNoteTime(data.updated_at),
      };
    } catch (error: any) {
      console.log('Schema-related error:', error.message);
      throw error;
    }
  },

  async update(id: string, updates: { title?: string; content?: string }): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { if (isSchemaError(error)) throw error; }
  },
};
