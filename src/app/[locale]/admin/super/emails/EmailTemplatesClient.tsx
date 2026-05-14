'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getEmailTemplatesAction, updateEmailTemplateAction } from '@/app/actions/superAdmin';
import { CheckCircle, Eye, Code2, RotateCcw, Save, Loader2 } from 'lucide-react';

type TemplateKey = 'confirmation' | 'reminder' | 'cancellation' | 'reschedule' | 'trialWarning' | 'surveyInvite';
type Templates = Awaited<ReturnType<typeof getEmailTemplatesAction>>;

const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  confirmation: ['customerName', 'serviceName', 'date', 'time', 'branchName', 'staffName', 'tenantName', 'phone', 'contactEmail'],
  reminder:     ['customerName', 'serviceName', 'date', 'time', 'branchName', 'staffName', 'tenantName', 'phone', 'contactEmail'],
  cancellation: ['customerName', 'serviceName', 'date', 'time', 'branchName', 'tenantName', 'phone', 'contactEmail'],
  reschedule:   ['customerName', 'serviceName', 'oldDate', 'oldTime', 'newDate', 'newTime', 'branchName', 'staffName', 'tenantName', 'phone', 'contactEmail'],
  trialWarning: ['businessName', 'daysLeft', 'adminName'],
  surveyInvite: ['customerName', 'tenantName', 'surveyUrl'],
};

const TEMPLATE_KEYS = Object.keys(TEMPLATE_VARIABLES) as TemplateKey[];

type PreviewLocale = 'es' | 'en';

export default function EmailTemplatesClient({ initialTemplates, locale }: { initialTemplates: Templates; locale: string }) {
  const t = useTranslations('SuperAdmin.emailTemplatesPage');
  const [selected, setSelected] = useState<TemplateKey>('confirmation');
  const [templates, setTemplates] = useState<Templates>(initialTemplates);
  const [view, setView] = useState<'preview' | 'editor'>('preview');
  const [editorValue, setEditorValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savedKey, setSavedKey] = useState<TemplateKey | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>('es');

  const loadPreview = useCallback(async (key: TemplateKey, locale: PreviewLocale = 'es') => {
    setLoadingPreview(true);
    setPreviewHtml(null);
    try {
      const res = await fetch(`/api/super/email-preview?template=${key}&locale=${locale}`);
      const html = await res.text();
      setPreviewHtml(html);
    } catch {
      setPreviewHtml(`<p style="padding:20px;color:red">${t('previewError')}</p>`);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const loadDefaultHtml = useCallback(async (key: TemplateKey, locale: PreviewLocale = 'es') => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/super/email-preview?template=${key}&locale=${locale}`);
      const html = await res.text();
      setEditorValue(html);
    } catch {
      setEditorValue(t('loadError'));
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleSelectTemplate = (key: TemplateKey) => {
    setSelected(key);
    setView('preview');
    setPreviewHtml(null);
    loadPreview(key, previewLocale);
  };

  const handleSwitchView = async (newView: 'preview' | 'editor') => {
    if (newView === 'preview' && view !== 'preview') {
      await loadPreview(selected, previewLocale);
    }
    if (newView === 'editor' && view !== 'editor') {
      const customHtml = templates[selected];
      if (customHtml) {
        setEditorValue(customHtml);
      } else {
        await loadDefaultHtml(selected, previewLocale);
      }
    }
    setView(newView);
  };

  const handleLocaleChange = (locale: PreviewLocale) => {
    setPreviewLocale(locale);
    if (view === 'preview') {
      loadPreview(selected, locale);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmailTemplateAction(selected, editorValue);
      setTemplates(prev => ({ ...prev, [selected]: editorValue }));
      setSavedKey(selected);
      setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(t('resetConfirm'))) return;
    setSaving(true);
    try {
      await updateEmailTemplateAction(selected, null);
      setTemplates(prev => ({ ...prev, [selected]: null }));
      if (view === 'editor') {
        await loadDefaultHtml(selected);
      } else {
        await loadPreview(selected);
      }
    } finally {
      setSaving(false);
    }
  };

  // Load initial preview on mount
  if (previewHtml === null && view === 'preview' && !loadingPreview) {
    loadPreview(selected, previewLocale);
  }

  const selectedLabel = t(`templates.${selected}.label`);
  const selectedDescription = t(`templates.${selected}.description`);
  const selectedVars = TEMPLATE_VARIABLES[selected];
  const hasCustom = !!templates[selected];

  return (
    <div className="flex gap-6 min-h-[calc(100vh-200px)]">
      {/* Left panel — template list */}
      <div className="w-64 shrink-0 space-y-1">
        {TEMPLATE_KEYS.map(key => {
          const isCustom = !!templates[key];
          return (
            <button
              key={key}
              onClick={() => handleSelectTemplate(key)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                selected === key
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold leading-tight">{t(`templates.${key}.label`)}</span>
                {isCustom && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    selected === key ? 'bg-white/20 text-white' : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  }`}>
                    Custom
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${selected === key ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-500'}`}>
                {t(`templates.${key}.trigger`)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-white/5">
            <div>
              <h2 className="font-black text-zinc-900 dark:text-white">{selectedLabel}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{selectedDescription}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasCustom && (
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('reset')}
                </button>
              )}
              {view === 'editor' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedKey === selected ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savedKey === selected ? t('saved') : t('save')}
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center justify-between gap-1 px-6 pt-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSwitchView('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'preview'
                    ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Eye className="w-4 h-4" />
                {t('previewTab')}
              </button>
              <button
                onClick={() => handleSwitchView('editor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'editor'
                    ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Code2 className="w-4 h-4" />
                {t('editorTab')}
                {hasCustom && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-full">
                    Custom
                  </span>
                )}
              </button>
            </div>
            {view === 'preview' && (
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 rounded-xl p-1">
                {(['es', 'en'] as PreviewLocale[]).map(loc => (
                  <button
                    key={loc}
                    onClick={() => handleLocaleChange(loc)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      previewLocale === loc
                        ? 'bg-white dark:bg-white/15 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col gap-4">
            {view === 'preview' ? (
              <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900" style={{ minHeight: 480 }}>
                {loadingPreview ? (
                  <div className="flex items-center justify-center h-full" style={{ minHeight: 480 }}>
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    style={{ minHeight: 480 }}
                    sandbox="allow-same-origin"
                    title={`Preview: ${selectedLabel}`}
                  />
                ) : null}
              </div>
            ) : (
              <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10">
                {loadingPreview ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <textarea
                    value={editorValue}
                    onChange={e => setEditorValue(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full min-h-[480px] font-mono text-xs bg-zinc-950 text-zinc-100 p-4 resize-none focus:outline-none leading-relaxed"
                    placeholder="HTML..."
                  />
                )}
              </div>
            )}

            {/* Variables */}
            <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{t('variablesTitle')}</p>
                {view === 'preview' && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{t('previewNote')}</p>
                )}
                {view === 'editor' && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('editorNote')}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedVars.map(varKey => {
                  const token = `{{${varKey}}}`;
                  const desc = t(`variables.${varKey}`);
                  return view === 'editor' ? (
                    <button
                      key={varKey}
                      onClick={() => setEditorValue(prev => prev + token)}
                      title={token}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-mono rounded-lg transition-colors"
                    >
                      {token}
                      <span className="text-zinc-500 dark:text-zinc-500 font-sans normal-case font-normal">— {desc}</span>
                    </button>
                  ) : (
                    <div
                      key={varKey}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-mono rounded-lg"
                    >
                      {token}
                      <span className="text-zinc-400 dark:text-zinc-500 font-sans normal-case font-normal">— {desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
