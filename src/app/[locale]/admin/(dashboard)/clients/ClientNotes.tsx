"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { FileText, MoreHorizontal, Pencil, Trash2, AlertTriangle, Loader2, StickyNote } from "lucide-react";
import {
  getClientNotesAction,
  createClientNoteAction,
  updateClientNoteAction,
  deleteClientNoteAction,
} from "@/app/actions/clientNotes";

// ─── Warning keywords that trigger alert highlight ─────────────────────────
const WARNING_KEYWORDS = [
  'alergia', 'alérgica', 'alérgico', 'alergica', 'alergico',
  'no usar', 'cuidado', 'precaución', 'precaucion',
  'allergy', 'allergic', 'do not use', 'caution', 'warning',
];

function isWarningNote(content: string): boolean {
  const lower = content.toLowerCase();
  return WARNING_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── Relative time formatter ──────────────────────────────────────────────
function formatRelative(date: Date, locale: string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (locale === 'en') {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    if (minutes < 1) return 'justo ahora';
    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days} días`;
    return new Date(date).toLocaleDateString('es', { month: 'short', day: 'numeric' });
  }
}

function formatFull(date: Date): string {
  return new Date(date).toLocaleString('es', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Types ────────────────────────────────────────────────────────────────
type Note = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
  updatedAt: Date;
};

interface ClientNotesProps {
  clientEmail: string | null;
  clientName: string;
  currentUserId: string;
  currentUserRole: string;
  locale: string;
  collapsible?: boolean; // when true, non-warning notes are hidden behind a toggle
}

export default function ClientNotes({
  clientEmail,
  clientName,
  currentUserId,
  currentUserRole,
  locale,
  collapsible = false,
}: ClientNotesProps) {
  const t = useTranslations('ClientNotes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Load notes on mount
  useEffect(() => {
    getClientNotesAction(clientEmail, clientName).then(({ notes }) => {
      setNotes((notes as Note[]) || []);
      setLoading(false);
    });
  }, [clientEmail, clientName]);

  // Focus edit textarea when editing starts
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [editingId]);

  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

  // Create note
  async function handleCreate() {
    if (!newContent.trim() || saving) return;
    setSaving(true);
    const result = await createClientNoteAction(clientEmail, clientName, newContent);
    if (result.note) {
      setNotes(prev => [result.note as Note, ...prev]);
      setNewContent('');
    }
    setSaving(false);
  }

  // Start edit
  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  // Save edit
  async function handleSaveEdit(noteId: string) {
    if (!editContent.trim()) return;
    const result = await updateClientNoteAction(noteId, editContent);
    if (result.note) {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...result.note as Note } : n));
      setEditingId(null);
    }
  }

  // Delete note
  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    await deleteClientNoteAction(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    setConfirmDeleteId(null);
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-violet-600" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('sectionTitle')}</h3>
      </div>

      {/* Create textarea */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value.slice(0, 500))}
            placeholder={t('placeholder')}
            rows={3}
            className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none transition-all text-sm font-medium text-slate-900 dark:text-white resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
          <span className="absolute bottom-2 right-3 text-xs text-slate-400 dark:text-zinc-500 pointer-events-none">
            {t('charCount', { count: newContent.length })}
          </span>
        </div>
        <button
          onClick={handleCreate}
          disabled={!newContent.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          {t('addButton')}
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
          <StickyNote className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => {
            const isWarning = isWarningNote(note.content);
            const isEdited = new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 2000;
            const canEdit = isAdmin || note.authorId === currentUserId;
            const isEditing = editingId === note.id;
            const isDeleting = deletingId === note.id;
            // In collapsible mode, hide non-warning notes unless expanded
            if (collapsible && !isWarning && !notesExpanded) return null;

            return (
              <div
                key={note.id}
                className={`relative rounded-2xl border p-4 transition-all ${
                  isWarning
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40'
                    : 'bg-white dark:bg-white/[0.03] border-slate-100 dark:border-white/5'
                }`}
              >
                {isWarning && (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    {t('warningNote')}
                  </div>
                )}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <textarea
                        ref={editRef}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value.slice(0, 500))}
                        rows={3}
                        className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none text-sm font-medium text-slate-900 dark:text-white resize-none"
                      />
                      <span className="absolute bottom-2 right-3 text-xs text-slate-400 pointer-events-none">
                        {t('charCount', { count: editContent.length })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(note.id)} disabled={!editContent.trim()} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors">{t('saveEdit')}</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-lg transition-colors">{t('cancelEdit')}</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">{note.content}</p>
                )}
                {!isEditing && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 text-xs font-black px-1.5 py-0.5 rounded-md ${note.authorRole === 'ADMIN' || note.authorRole === 'SUPER_ADMIN' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'}`}>
                        {note.authorRole === 'ADMIN' || note.authorRole === 'SUPER_ADMIN' ? t('roleAdmin') : t('roleStaff')}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 truncate font-medium">{note.authorName}</span>
                      <span className="text-slate-300 dark:text-zinc-700 text-xs">·</span>
                      <span title={formatFull(note.createdAt)} className="text-xs text-slate-400 dark:text-zinc-500 shrink-0 cursor-default">
                        {formatRelative(note.createdAt, locale)}{isEdited && <span className="ml-1 opacity-70">({t('edited')})</span>}
                      </span>
                    </div>
                    {(canEdit || isAdmin) && (
                      <NoteActions canEdit={canEdit} canDelete={isAdmin} isDeleting={isDeleting} confirmDeleteId={confirmDeleteId} noteId={note.id} onEdit={() => startEdit(note)} onDeleteRequest={() => setConfirmDeleteId(note.id)} onDeleteConfirm={() => handleDelete(note.id)} onDeleteCancel={() => setConfirmDeleteId(null)} t={t} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* Collapsible toggle for non-warning notes */}
          {collapsible && notes.filter(n => !isWarningNote(n.content)).length > 0 && (
            <button
              onClick={() => setNotesExpanded(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
            >
              <span>{notesExpanded ? (locale === 'es' ? 'Ocultar notas' : 'Hide notes') : (locale === 'es' ? `Ver ${notes.filter(n => !isWarningNote(n.content)).length} nota(s)` : `Show ${notes.filter(n => !isWarningNote(n.content)).length} note(s)`)}</span>
              <span className="text-xs">{notesExpanded ? '▲' : '▼'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline action menu component ─────────────────────────────────────────
function NoteActions({
  canEdit, canDelete, isDeleting, confirmDeleteId, noteId,
  onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel, t
}: {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  confirmDeleteId: string | null;
  noteId: string;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  t: ReturnType<typeof useTranslations<'ClientNotes'>>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (confirmDeleteId === noteId) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:block">{t('deleteConfirmTitle')}</span>
        <button
          onClick={onDeleteConfirm}
          disabled={isDeleting}
          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-md transition-colors"
        >
          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : t('deleteConfirmBtn')}
        </button>
        <button
          onClick={onDeleteCancel}
          className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-md transition-colors"
        >
          {t('deleteCancelBtn')}
        </button>
      </div>
    );
  }

  if (!canEdit && !canDelete) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-8 z-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 min-w-[110px]">
          {canEdit && (
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <Pencil className="w-3 h-3" /> {t('editAction')}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { setOpen(false); onDeleteRequest(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> {t('deleteAction')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
