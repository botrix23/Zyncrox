"use client";

import { useState, useEffect } from "react";
import { StickyNote, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getClientNotesPreviewAction, createClientNoteAction } from "@/app/actions/clientNotes";

const WARNING_KEYWORDS = [
  'alergia', 'alérgica', 'alérgico', 'alergica', 'alergico',
  'no usar', 'cuidado', 'precaución', 'precaucion',
  'allergy', 'allergic', 'do not use', 'caution', 'warning',
];

function isWarningNote(content: string): boolean {
  return WARNING_KEYWORDS.some(kw => content.toLowerCase().includes(kw));
}

function formatRelative(date: Date, locale: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (locale === 'en') {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

type Note = {
  id: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
};

interface ClientNotesPreviewProps {
  clientEmail: string | null;
  clientName: string;
  totalCount?: number;
  locale: string;
}

export default function ClientNotesPreview({
  clientEmail,
  clientName,
  locale,
}: ClientNotesPreviewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isEs = locale !== 'en';
  const labels = {
    sectionTitle: isEs ? 'Notas del cliente' : 'Client notes',
    empty: isEs ? 'Sin notas para este cliente' : 'No notes for this client',
    addBtn: isEs ? 'Agregar nota' : 'Add note',
    placeholder: isEs ? 'Nota rápida sobre el cliente...' : 'Quick note about the client...',
    save: isEs ? 'Guardar' : 'Save',
    cancel: isEs ? 'Cancelar' : 'Cancel',
    viewAll: (count: number | string) => isEs ? `Ver todas las notas (${count})` : `View all notes (${count})`,
    roleAdmin: isEs ? 'Admin' : 'Admin',
    roleStaff: isEs ? 'Staff' : 'Staff',
    warning: isEs ? 'Alerta' : 'Alert',
    pinned: isEs ? 'Fijada' : 'Pinned',
    seeMore: isEs ? 'ver más' : 'see more',
    seeLess: isEs ? 'ver menos' : 'see less',
  };

  useEffect(() => {
    getClientNotesPreviewAction(clientEmail, clientName, 10).then(({ notes }) => {
      // Pin alert notes to the top
      const sorted = [...((notes as Note[]) || [])].sort((a, b) => {
        const aWarn = isWarningNote(a.content) ? 0 : 1;
        const bWarn = isWarningNote(b.content) ? 0 : 1;
        return aWarn - bWarn;
      });
      setNotes(sorted);
      setLoading(false);
    });
    // Also fetch total count (we load the same 3, but the action gives us only 3)
    // We use notes.length to detect "3+" in the UI
  }, [clientEmail, clientName]);

  async function handleAdd() {
    if (!newContent.trim() || saving) return;
    setSaving(true);
    const result = await createClientNoteAction(clientEmail, clientName, newContent);
    if (result.note) {
      setNotes(prev => [result.note as Note, ...prev.slice(0, 2)]);
      setNewContent('');
      setShowAdd(false);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 dark:border-violet-500/10">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-black text-violet-700 dark:text-violet-300 uppercase tracking-wider">
            {labels.sectionTitle}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
        >
          {labels.addBtn}
        </button>
      </div>

      {/* Quick add form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-violet-100 dark:border-violet-500/10 space-y-2">
          <div className="relative">
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value.slice(0, 500))}
              placeholder={labels.placeholder}
              rows={2}
              autoFocus
              className="w-full p-2.5 bg-white dark:bg-white/5 border border-violet-200 dark:border-violet-500/30 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none text-xs font-medium text-slate-900 dark:text-white resize-none placeholder:text-slate-400"
            />
            <span className="absolute bottom-2 right-2.5 text-xs text-slate-400 pointer-events-none">
              {newContent.length}/500
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newContent.trim() || saving}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {labels.save}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewContent(''); }}
              className="px-3 py-1.5 bg-white dark:bg-white/10 text-slate-500 dark:text-zinc-400 text-xs font-bold rounded-lg transition-colors"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="divide-y divide-violet-100 dark:divide-violet-500/10">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-4 px-4">
            {labels.empty}
          </p>
        ) : (
          notes.map(note => {
            const isWarning = isWarningNote(note.content);
            const isLong = note.content.length > 120;
            const isExpanded = expanded === note.id;
            const displayContent = isLong && !isExpanded
              ? note.content.slice(0, 120) + '…'
              : note.content;

            return (
              <div
                key={note.id}
                className={`px-4 py-3 ${isWarning ? 'bg-amber-50/80 dark:bg-amber-900/10' : ''}`}
              >
                {isWarning && (
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-black">
                      <AlertTriangle className="w-3 h-3" /> {labels.warning}
                    </div>
                    <span className="text-xs text-amber-500 font-black">📌 {labels.pinned}</span>
                  </div>
                )}
                <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                  {displayContent}
                  {isLong && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : note.id)}
                      className="ml-1 text-violet-500 hover:underline font-bold"
                    >
                      {isExpanded ? labels.seeLess : labels.seeMore}
                    </button>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-xs font-black px-1 py-0.5 rounded ${
                    note.authorRole === 'ADMIN' || note.authorRole === 'SUPER_ADMIN'
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                  }`}>
                    {note.authorRole === 'ADMIN' || note.authorRole === 'SUPER_ADMIN'
                      ? labels.roleAdmin : labels.roleStaff}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">{note.authorName}</span>
                  <span className="text-slate-300 dark:text-zinc-700">·</span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    {formatRelative(note.createdAt, locale)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* "View all" link when there might be more */}
      {notes.length === 3 && (
        <div className="px-4 py-2.5 border-t border-violet-100 dark:border-violet-500/10 text-center">
          <span className="text-xs text-violet-500 dark:text-violet-400 font-bold">
            {labels.viewAll('3+')}
          </span>
        </div>
      )}
    </div>
  );
}
