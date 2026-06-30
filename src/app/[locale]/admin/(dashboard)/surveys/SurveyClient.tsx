"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  MessageSquare,
  Info,
  Lock,
  ChevronUp,
  ChevronDown,
  X,
  Edit2,
  BarChart3,
  Settings,
  ExternalLink,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Portal } from "@/components/Portal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { 
  updateSurveySettingsAction, 
  upsertSurveyQuestionAction, 
  deleteSurveyQuestionAction, 
  reorderSurveyQuestionsAction 
} from "@/app/actions/survey";
import { useRouter } from "next/navigation";

function ResponsesScroll({ children, bgFrom = 'bg-white dark:bg-zinc-900' }: { children: React.ReactNode; bgFrom?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [showGradient, setShowGradient] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setShowGradient(el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight < el.scrollHeight - 2)
    check()
    el.addEventListener('scroll', check)
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', check); ro.disconnect() }
  }, [children])

  return (
    <div className="relative">
      <div ref={ref} className="max-h-[160px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
        {children}
      </div>
      {showGradient && (
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-purple-200 dark:from-zinc-900 to-transparent pointer-events-none rounded-b-lg" />
      )}
    </div>
  )
}

interface SurveyQuestion {
  id: string;
  questionText: string;
  questionType: 'STARS' | 'YES_NO' | 'TEXT' | 'NPS';
  category: 'STAFF' | 'BUSINESS';
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function SurveyClient({
  tenantId,
  initialEnabled,
  initialQuestions,
  initialReviews = [],
  canUseAdvanced,
  locale,
  slug,
  totalSurveySent = 0,
}: {
  tenantId: string;
  initialEnabled: boolean;
  initialQuestions: any[];
  initialReviews?: any[];
  canUseAdvanced: boolean;
  locale: string;
  slug: string | null;
  totalSurveySent?: number;
}) {
  const t = useTranslations('Surveys');
  const router = useRouter();
  
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');
  const [showNpsLock, setShowNpsLock] = useState(false);

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const handleToggleSurvey = async () => {
    setIsUpdatingSettings(true);
    try {
      const result = await updateSurveySettingsAction(tenantId, !isEnabled);
      if (result.success) {
        setIsEnabled(!isEnabled);
      }
    } catch (error) {
      alert(t('errors.update'));
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleOpenModal = (question?: SurveyQuestion) => {
    if (!canUseAdvanced && questions.length >= 2) {
        return; 
    }
    setEditingQuestion(question || {
      questionText: "",
      questionType: "STARS",
      category: "STAFF",
      isRequired: true,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion?.questionText) return;

    setIsSavingQuestion(true);
    try {
      const result = await upsertSurveyQuestionAction({
        ...(editingQuestion as any),
        tenantId,
      });

      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      }
    } catch (error) {
      alert(t('errors.save'));
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const handleDeleteQuestion = (id: string) => {
    setDeleteQuestionId(id);
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionId) return;
    const id = deleteQuestionId;
    setDeleteQuestionId(null);
    try {
      const result = await deleteSurveyQuestionAction(id);
      if (result.success) router.refresh();
    } catch { /* noop */ }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    setQuestions(newQuestions);
    await reorderSurveyQuestionsAction(tenantId, newQuestions.map(q => q.id));
  };

  // --- Results Tab State ---
  type Preset = '7d' | '30d' | 'month' | 'prevMonth' | '90d';
  const [preset, setPreset] = useState<Preset>('30d');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterRating, setFilterRating] = useState('');

  // Date range from preset
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date = new Date();
    if (preset === '7d') {
      from = new Date(now); from.setDate(from.getDate() - 7);
    } else if (preset === '30d') {
      from = new Date(now); from.setDate(from.getDate() - 30);
    } else if (preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === 'prevMonth') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else { // 90d
      from = new Date(now); from.setDate(from.getDate() - 90);
    }
    return { dateFrom: from, dateTo: to };
  }, [preset]);

  // Reviews filtered by date
  const filteredByDate = useMemo(() => {
    return initialReviews.filter((r: any) => {
      const d = new Date(r.createdAt);
      return d >= dateFrom && d <= dateTo;
    });
  }, [initialReviews, dateFrom, dateTo]);

  // Reviews further filtered by staff/service/rating
  const filteredReviews = useMemo(() => {
    return filteredByDate.filter((r: any) => {
      if (filterStaff && r.booking?.staff?.id !== filterStaff) return false;
      if (filterService && r.booking?.service?.id !== filterService) return false;
      if (filterRating) {
        const rounded = Math.round(Number(r.rating));
        if (rounded !== Number(filterRating)) return false;
      }
      return true;
    });
  }, [filteredByDate, filterStaff, filterService, filterRating]);

  // Unique staff/services across all reviews (for filter dropdowns)
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    initialReviews.forEach((r: any) => {
      if (r.booking?.staff?.id) map.set(r.booking.staff.id, r.booking.staff.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [initialReviews]);

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string>();
    initialReviews.forEach((r: any) => {
      if (r.booking?.service?.id) map.set(r.booking.service.id, r.booking.service.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [initialReviews]);

  // Rating by service (based on date-filtered reviews)
  const ratingByService = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filteredByDate.forEach((r: any) => {
      const name = r.booking?.service?.name || t('audit.table.serviceFallback');
      const existing = map.get(name) || { total: 0, count: 0 };
      map.set(name, { total: existing.total + Number(r.rating), count: existing.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, { total, count }]) => ({ name, avg: total / count, count }))
      .sort((a, b) => b.avg - a.avg);
  }, [filteredByDate]);

  // Rating distribution (based on date-filtered reviews)
  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredByDate.forEach((r: any) => {
      const rounded = Math.round(Number(r.rating));
      if (rounded >= 1 && rounded <= 5) counts[rounded]++;
    });
    const total = filteredByDate.length;
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: counts[star],
      pct: total > 0 ? Math.round((counts[star] / total) * 100) : 0,
    }));
  }, [filteredByDate]);

  // Aggregate stats
  const responseRate = totalSurveySent > 0 ? Math.round((filteredByDate.length / totalSurveySent) * 100) : 0;
  const avgRating = filteredByDate.length > 0
    ? (filteredByDate.reduce((acc: number, r: any) => acc + Number(r.rating), 0) / filteredByDate.length).toFixed(1)
    : null;

  return (
    <>
    <ConfirmDialog
      open={!!deleteQuestionId}
      title={t('confirmDelete')}
      message="Esta pregunta se eliminará permanentemente de la encuesta."
      confirmLabel="Sí, eliminar"
      variant="danger"
      onConfirm={confirmDeleteQuestion}
      onCancel={() => setDeleteQuestionId(null)}
    />
    <div className="space-y-6">
      {/* Tabs — desktop */}
      <div className="hidden md:flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === 'questions' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
        >
          <Settings className="w-4 h-4 shrink-0" /> {t('tabs.questions')}
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${activeTab === 'results' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" /> {t('tabs.results')}
        </button>
      </div>
      {/* Tabs — mobile */}
      <div className="md:hidden relative">
        <select
          value={activeTab}
          onChange={e => setActiveTab(e.target.value as any)}
          className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
        >
          <option value="questions">{t('tabs.questions')}</option>
          <option value="results">{t('tabs.results')}</option>
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {activeTab === 'questions' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Share Section */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('link.title')}</h3>
                <p className="text-sm text-slate-400 font-medium italic">{t('link.description')}</p>
              </div>
              <a
                href={`/${locale}/review/test?tenantId=${tenantId}`}
                target="_blank"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-150 hover:-translate-y-0.5 shadow-sm shadow-purple-500/20 shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                {t('link.previewBtn')}
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  {t('enableToggle')}
                </h3>
                <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium">
                  {t('enableDesc')}
                </p>
              </div>
              <button
                onClick={handleToggleSurvey}
                disabled={isUpdatingSettings}
                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 mt-1 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md ${isEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="border-t border-slate-50 dark:border-white/5 pt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black tracking-widest text-slate-400">
                  {t('questionsList')}
                </h4>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black tracking-widest shadow-xl shadow-purple-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {t('addQuestion')}
                </button>
              </div>

              {!canUseAdvanced && (
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-start gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-600">
                     <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-black text-amber-700 dark:text-amber-400 tracking-tight">{t('upgradeRequired')}</h5>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-500/80 leading-relaxed">
                      {t('upgradeDesc')}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-white/5 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <Star className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 font-bold italic">{t('noQuestions')}</p>
                  </div>
                ) : (
                  questions.map((q, index) => (
                    <div
                      key={q.id}
                      className={`group bg-slate-50 dark:bg-white/5 rounded-[24px] p-4 border border-transparent hover:border-purple-500/30 transition-all flex items-start gap-3 ${!q.isActive ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-all disabled:opacity-0"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === questions.length - 1}
                          className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-all disabled:opacity-0"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight break-words">{q.questionText}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black tracking-widest text-slate-400">
                          <span className="flex items-center gap-1 shrink-0">
                            {q.questionType === 'STARS' && <Star className="w-3 h-3 text-yellow-500" />}
                            {q.questionType === 'YES_NO' && <CheckCircle2 className="w-3 h-3 text-sky-500" />}
                            {q.questionType === 'TEXT' && <MessageSquare className="w-3 h-3 text-purple-500" />}
                            {q.questionType === 'NPS' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            <span className="truncate">{t(`types.${q.questionType}`)}</span>
                          </span>
                          <span className="text-slate-300 dark:text-zinc-700 shrink-0">•</span>
                          <span className={`px-2 py-0.5 rounded-md shrink-0 ${q.category === 'STAFF' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {t(`categories.${q.category}`)}
                          </span>
                          {q.isRequired && (
                            <>
                              <span className="text-slate-300 dark:text-zinc-700 shrink-0">•</span>
                              <span className="text-slate-500 shrink-0">{t('isRequired')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleOpenModal(q)}
                          className="p-2.5 bg-white dark:bg-zinc-800 hover:bg-purple-600 hover:text-white rounded-xl shadow-sm transition-all border border-slate-100 dark:border-white/5"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2.5 bg-white dark:bg-zinc-800 hover:bg-rose-500 hover:text-white rounded-xl shadow-sm transition-all border border-slate-100 dark:border-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Date filter presets */}
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', 'month', 'prevMonth', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest transition-all ${preset === p ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20' : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-400 hover:border-purple-400'}`}
              >
                {t(`dateFilter.${p}`)}
              </button>
            ))}
          </div>

          {/* Summary Stats — 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Responses */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-xs font-black tracking-widest text-slate-400">{t('stats.totalResponses')}</p>
              </div>
              <div className="flex items-end gap-2">
                <h4 className="text-4xl font-black text-slate-900 dark:text-white">{filteredByDate.length}</h4>
                <p className="text-xs font-bold text-slate-400 mb-1.5">{t('stats.completed')}</p>
              </div>
            </div>

            {/* Response Rate */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xs font-black tracking-widest text-slate-400">{t('stats.responseRate')}</p>
              </div>
              <div className="flex items-end gap-2">
                <h4 className={`text-4xl font-black ${totalSurveySent === 0 ? 'text-slate-300 dark:text-zinc-600' : responseRate >= 50 ? 'text-emerald-500' : responseRate >= 25 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {totalSurveySent === 0 ? t('stats.noData') : `${responseRate}%`}
                </h4>
                {totalSurveySent > 0 && (
                  <p className="text-xs font-bold text-slate-400 mb-1.5">
                    {t('stats.responseRateSub', { sent: totalSurveySent })}
                  </p>
                )}
              </div>
            </div>

            {/* Avg Staff Rating */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl">
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-xs font-black tracking-widest text-slate-400">{t('stats.avgStaffRating')}</p>
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-4xl font-black text-slate-900 dark:text-white">
                  {avgRating ?? t('stats.noData')}
                </h4>
                {avgRating && <Star className="w-6 h-6 text-yellow-400 fill-current" />}
              </div>
            </div>
          </div>

          {/* Rating by service + Distribution — side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Calificación por servicio */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-purple-500" />
                {t('ratingByService.title')}
              </h3>
              {ratingByService.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-slate-400 italic">{t('ratingByService.noData')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratingByService.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 dark:border-white/5 last:border-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate flex-1">{svc.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{svc.avg.toFixed(1)}</span>
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        <span className="text-xs font-bold text-slate-400 ml-1">({svc.count} {t('ratingByService.evaluations')})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Distribución de calificaciones */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                {t('distribution.title')}
              </h3>
              {filteredByDate.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-slate-400 italic">{t('distribution.noData')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {distribution.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-14 shrink-0">
                        <span className="text-xs font-black text-slate-600 dark:text-zinc-300">{star}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right shrink-0">
                        <span className="text-xs font-black text-slate-500">{count} <span className="font-bold text-slate-400">({pct}%)</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Historial de evaluaciones */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 md:p-8 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                {t('audit.title')}
              </h3>
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="">{t('audit.filters.allStaff')}</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="">{t('audit.filters.allServices')}</option>
                  {serviceOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="">{t('audit.filters.allRatings')}</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={String(n)}>{t('audit.filters.stars', { n })}</option>
                  ))}
                </select>
              </div>
            </div>

            {initialReviews.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Info className="w-12 h-12 text-slate-100 dark:text-zinc-800 mx-auto" />
                <p className="text-sm font-bold text-slate-400 italic">{t('audit.noReviews')}</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Info className="w-12 h-12 text-slate-100 dark:text-zinc-800 mx-auto" />
                <p className="text-sm font-bold text-slate-400 italic">{t('audit.noResults')}</p>
              </div>
            ) : (
              <>
                {/* ── Mobile: vertical cards (same data as desktop) ── */}
                <div className="md:hidden space-y-3">
                  {filteredReviews.map((r: any) => (
                    <div key={r.id} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-3">

                      {/* Row 1: rating + customer */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 shadow-sm border border-slate-100 dark:border-white/5 shrink-0">
                          <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{Number(r.rating).toFixed(1)}</span>
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{r.booking?.customerName || t('audit.table.noCustomer')}</p>
                          <p className="text-xs font-bold text-purple-600">{r.booking?.staff?.name || t('audit.table.staffFallback')}</p>
                          <p className="text-xs text-slate-400 font-medium">{r.booking?.service?.name || t('audit.table.serviceFallback')}</p>
                        </div>
                      </div>

                      {/* Row 2: dates */}
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-white/5 pt-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t('audit.table.bookingDate')}</span>
                          <span className="text-slate-700 dark:text-zinc-300">
                            {r.booking?.startTime
                              ? `${new Date(r.booking.startTime).toLocaleDateString(locale)} ${new Date(r.booking.startTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t('audit.table.submittedDate')}</span>
                          <span>{new Date(r.createdAt).toLocaleDateString(locale)}</span>
                        </div>
                      </div>

                      {/* Row 3: comment + all custom responses */}
                      {(r.comment || r.responses?.some((resp: any) => resp.answer != null && resp.answer !== '')) && (
                        <div className="border-t border-slate-100 dark:border-white/5 pt-2.5">
                          <ResponsesScroll bgFrom="bg-slate-50 dark:bg-zinc-800">
                          {r.comment && (
                            <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium italic border-l-2 border-purple-500/30 pl-3">"{r.comment}"</p>
                          )}
                          {r.responses?.filter((resp: any) => resp.answer != null && resp.answer !== '').map((resp: any, i: number) => (
                            <div key={i} className="px-2.5 py-1.5 bg-purple-500/5 rounded-lg border border-purple-500/10">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-0.5">{resp.questionText}</p>
                              {resp.questionType === 'TEXT' && (
                                <p className="text-xs text-purple-600 font-bold break-words">{resp.answer}</p>
                              )}
                              {resp.questionType === 'STARS' && (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, s) => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s < Number(resp.answer) ? 'text-yellow-400 fill-current' : 'text-slate-200 dark:text-zinc-600'}`} />
                                  ))}
                                  <span className="text-xs text-slate-500 ml-1">{t('audit.responses.starsLabel', { value: resp.answer })}</span>
                                </div>
                              )}
                              {resp.questionType === 'YES_NO' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${resp.answer === 'yes' || resp.answer === true || resp.answer === 'true' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {(resp.answer === 'yes' || resp.answer === true || resp.answer === 'true') ? t('audit.responses.yes') : t('audit.responses.no')}
                                </span>
                              )}
                              {resp.questionType === 'NPS' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  {t('audit.responses.npsLabel')} {resp.answer}
                                </span>
                              )}
                            </div>
                          ))}
                          </ResponsesScroll>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Desktop: table (same columns as mobile cards) ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5">
                        <th className="pb-3 text-xs font-black tracking-widest text-slate-400 px-2 text-center">{t('audit.table.rating')}</th>
                        <th className="pb-3 text-xs font-black tracking-widest text-slate-400 px-3">{t('audit.table.customer')}</th>
                        <th className="pb-3 text-xs font-black tracking-widest text-slate-400 px-3">{t('audit.table.staffService')}</th>
                        <th className="pb-3 text-xs font-black tracking-widest text-slate-400 px-3">{t('audit.table.bookingDate')}</th>
                        <th className="pb-3 text-xs font-black tracking-widest text-slate-400 px-3">{t('audit.table.comment')}</th>
                        <th className="pb-3 text-xs font-black tracking-widest text-slate-400 px-3">{t('audit.table.submittedDate')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                      {filteredReviews.map((r: any) => (
                        <tr key={r.id} className="group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-all">
                          {/* Rating */}
                          <td className="py-4 px-2">
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{Number(r.rating).toFixed(1)}</span>
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            </div>
                          </td>
                          {/* Customer */}
                          <td className="py-4 px-3 max-w-[140px]">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{r.booking?.customerName || t('audit.table.noCustomer')}</p>
                          </td>
                          {/* Staff / Service */}
                          <td className="py-4 px-3 max-w-[180px]">
                            <p className="text-sm font-bold text-purple-600 truncate">{r.booking?.staff?.name || t('audit.table.staffFallback')}</p>
                            <p className="text-xs text-slate-400 truncate">{r.booking?.service?.name || t('audit.table.serviceFallback')}</p>
                          </td>
                          {/* Booking date */}
                          <td className="py-4 px-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                {r.booking?.startTime ? new Date(r.booking.startTime).toLocaleDateString(locale) : '—'}
                              </span>
                              {r.booking?.startTime && (
                                <span className="text-xs font-bold text-purple-500">
                                  {new Date(r.booking.startTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Comment + all custom responses */}
                          <td className="py-4 px-3 min-w-[200px] max-w-[320px]">
                            <ResponsesScroll>
                              {r.comment && (
                                <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium italic border-l-2 border-purple-500/30 pl-2">"{r.comment}"</p>
                              )}
                              {r.responses?.filter((resp: any) => resp.answer != null && resp.answer !== '').map((resp: any, i: number) => (
                                <div key={i} className="px-2 py-1 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                  <p className="text-xs font-black text-slate-400 tracking-tighter mb-0.5">{resp.questionText}</p>
                                  {resp.questionType === 'TEXT' && (
                                    <p className="text-xs text-purple-600 font-bold break-words">{resp.answer}</p>
                                  )}
                                  {resp.questionType === 'STARS' && (
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: 5 }).map((_, s) => (
                                        <Star key={s} className={`w-3 h-3 ${s < Number(resp.answer) ? 'text-yellow-400 fill-current' : 'text-slate-200 dark:text-zinc-600'}`} />
                                      ))}
                                      <span className="text-xs text-slate-500 ml-1">{t('audit.responses.starsLabel', { value: resp.answer })}</span>
                                    </div>
                                  )}
                                  {resp.questionType === 'YES_NO' && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold ${resp.answer === 'yes' || resp.answer === true || resp.answer === 'true' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                      {(resp.answer === 'yes' || resp.answer === true || resp.answer === 'true') ? t('audit.responses.yes') : t('audit.responses.no')}
                                    </span>
                                  )}
                                  {resp.questionType === 'NPS' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      {t('audit.responses.npsLabel')} {resp.answer}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </ResponsesScroll>
                          </td>
                          {/* Submitted date */}
                          <td className="py-4 px-3 whitespace-nowrap">
                            <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Pregunta */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             {/* Backdrop con Blur Dinámico - Fixed para cubrir todo */}
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {editingQuestion?.id ? t('edit') : t('addQuestion')}
                    </h3>
                    <p className="text-xs font-black tracking-widest text-slate-400 mt-1">{t('modal.config')}</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black tracking-widest text-slate-400 ml-1">
                      {t('questionText')}
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={editingQuestion?.questionText}
                      onChange={(e) => setEditingQuestion({...editingQuestion, questionText: e.target.value})}
                      placeholder={t('modal.placeholder')}
                      className="w-full p-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 rounded-[24px] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm font-medium dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-black tracking-widest text-slate-400 ml-1">
                        {t('questionType')}
                      </label>
                      <div className="relative">
                        <select
                          value={editingQuestion?.questionType}
                          onChange={(e) => {
                            if (e.target.value === 'NPS' && !canUseAdvanced) {
                              setShowNpsLock(true);
                              return;
                            }
                            setEditingQuestion({...editingQuestion, questionType: e.target.value as any});
                          }}
                          className="w-full p-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 rounded-[24px] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm font-medium dark:text-white appearance-none"
                        >
                          <option value="STARS">{t('types.STARS')}</option>
                          <option value="YES_NO">{t('types.YES_NO')}</option>
                          <option value="TEXT">{t('types.TEXT')}</option>
                          <option value="NPS" disabled={!canUseAdvanced}>
                            {t('types.NPS')}{!canUseAdvanced ? ` — ${t('npsLock.badge')}` : ''}
                          </option>
                        </select>
                      </div>
                      {/* NPS lock mini-modal */}
                      {showNpsLock && (
                        <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{t('npsLock.title')}</p>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{t('npsLock.body')}</p>
                            </div>
                            <button onClick={() => setShowNpsLock(false)} className="text-amber-500 hover:text-amber-700 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <a
                            href={`/${locale}/admin/billing`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-xl transition-colors"
                          >
                            {t('npsLock.cta')} →
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black tracking-widest text-slate-400 ml-1">
                        {t('category')}
                      </label>
                      <select
                        value={editingQuestion?.category}
                        onChange={(e) => setEditingQuestion({...editingQuestion, category: e.target.value as any})}
                        className="w-full p-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 rounded-[24px] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm font-medium dark:text-white appearance-none"
                      >
                        <option value="STAFF">{t('categories.STAFF')}</option>
                        <option value="BUSINESS">{t('categories.BUSINESS')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <button
                        onClick={() => setEditingQuestion({...editingQuestion, isRequired: !editingQuestion?.isRequired})}
                        className="flex items-center gap-3 group"
                      >
                        <div className={`w-12 h-7 rounded-full transition-all relative ${editingQuestion?.isRequired ? 'bg-purple-600' : 'bg-slate-200 dark:bg-zinc-800'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${editingQuestion?.isRequired ? 'left-6' : 'left-1'}`} />
                        </div>
                        <span className="text-xs font-black tracking-widest text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {t('isRequired')}
                        </span>
                      </button>
                    </div>

                    <div className="flex-1">
                      <button
                        onClick={() => setEditingQuestion({...editingQuestion, isActive: !editingQuestion?.isActive})}
                        className="flex items-center gap-3 group"
                      >
                        <div className={`w-12 h-7 rounded-full transition-all relative ${editingQuestion?.isActive ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-zinc-800'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${editingQuestion?.isActive ? 'left-6' : 'left-1'}`} />
                        </div>
                        <span className="text-xs font-black tracking-widest text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {t('isActive')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex pt-4">
                  <button
                    onClick={handleSaveQuestion}
                    disabled={isSavingQuestion || !editingQuestion?.questionText}
                    className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-[24px] font-black tracking-widest uppercase text-xs shadow-2xl shadow-purple-500/30 transition-all active:scale-95 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400"
                  >
                    {isSavingQuestion ? t('saving') : t('save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
    </>
  );
}
