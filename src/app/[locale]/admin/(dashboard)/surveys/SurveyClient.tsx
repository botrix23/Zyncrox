"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Star, 
  CheckCircle2, 
  MessageSquare, 
  Info, 
  Lock,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  Edit2,
  Copy,
  BarChart3,
  Settings,
  ExternalLink
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Portal } from "@/components/Portal";
import { 
  updateSurveySettingsAction, 
  upsertSurveyQuestionAction, 
  deleteSurveyQuestionAction, 
  reorderSurveyQuestionsAction 
} from "@/app/actions/survey";
import { useRouter } from "next/navigation";

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
  slug 
}: { 
  tenantId: string; 
  initialEnabled: boolean;
  initialQuestions: any[];
  initialReviews?: any[];
  canUseAdvanced: boolean;
  locale: string;
  slug: string | null;
}) {
  const t = useTranslations('Surveys');
  const router = useRouter();
  
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [origin, setOrigin] = useState("");
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const result = await deleteSurveyQuestionAction(id);
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      alert(t('errors.delete'));
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    setQuestions(newQuestions);
    await reorderSurveyQuestionsAction(tenantId, newQuestions.map(q => q.id));
  };

  const handleCopyUrl = () => {
    if (slug) {
      const baseUrl = `${origin}/${locale}/review/`;
      navigator.clipboard.writeText(baseUrl);
      alert(t('link.copyDone'));
    }
  };

  // NPS Calculation
  const npsResponses = initialReviews.flatMap(r => (r.responses || []) as any[]).filter(resp => resp.questionType === 'NPS');
  let npsScore = null;
  if (npsResponses.length > 0) {
    const promoters = npsResponses.filter(r => r.answer >= 9).length;
    const detractors = npsResponses.filter(r => r.answer <= 6).length;
    npsScore = Math.round(((promoters - detractors) / npsResponses.length) * 100);
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'questions' ? 'bg-white dark:bg-zinc-900 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
        >
          <Settings className="w-4 h-4" /> {t('tabs.questions')}
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'results' ? 'bg-white dark:bg-zinc-900 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
        >
          <BarChart3 className="w-4 h-4" /> {t('tabs.results')}
        </button>
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
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-2 pr-4 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden max-w-md">
                 <div className="px-3 py-2 bg-white dark:bg-zinc-800 rounded-xl text-xs font-mono text-slate-500 truncate">
                    {origin}{t('link.urlPattern', { locale })}
                 </div>
                 <div className="flex items-center gap-1">
                    <button 
                      onClick={handleCopyUrl}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-purple-600"
                      title={t('link.placeholder')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`/${locale}/review/test?tenantId=${tenantId}`}
                      target="_blank"
                      className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-purple-600"
                      title={t('link.preview')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  {t('enableToggle')}
                </h3>
                <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium">
                  {t('enableDesc')}
                </p>
              </div>
              <button
                onClick={handleToggleSurvey}
                disabled={isUpdatingSettings}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}
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
                      className={`group bg-slate-50 dark:bg-white/5 rounded-[24px] p-5 border border-transparent hover:border-purple-500/30 transition-all flex items-center gap-6 ${!q.isActive ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="flex flex-col gap-1">
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

                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{q.questionText}</p>
                        <div className="flex items-center gap-3 text-[11px] font-black tracking-widest text-slate-400">
                          <span className="flex items-center gap-1.5">
                            {q.questionType === 'STARS' && <Star className="w-3 h-3 text-yellow-500" />}
                            {q.questionType === 'YES_NO' && <CheckCircle2 className="w-3 h-3 text-sky-500" />}
                            {q.questionType === 'TEXT' && <MessageSquare className="w-3 h-3 text-purple-500" />}
                            {q.questionType === 'NPS' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            {t(`types.${q.questionType}`)}
                          </span>
                          <span className="text-slate-300 dark:text-zinc-700">•</span>
                          <span className={`px-2 py-0.5 rounded-md ${q.category === 'STAFF' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {t(`categories.${q.category}`)}
                          </span>
                          {q.isRequired && (
                            <span className="text-slate-300 dark:text-zinc-700">•</span>
                          )}
                          {q.isRequired && (
                            <span className="text-slate-500">{t('isRequired')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenModal(q)}
                          className="p-3 bg-white dark:bg-zinc-800 hover:bg-purple-600 hover:text-white rounded-xl shadow-sm transition-all border border-slate-100 dark:border-white/5"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-3 bg-white dark:bg-zinc-800 hover:bg-rose-500 hover:text-white rounded-xl shadow-sm transition-all border border-slate-100 dark:border-white/5"
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
           {/* Summary Stats */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
                 <p className="text-xs font-black tracking-widest text-slate-400">{t('stats.totalResponses')}</p>
                 <div className="flex items-end gap-2 mt-1">
                    <h4 className="text-4xl font-black text-slate-900 dark:text-white">{initialReviews.length}</h4>
                    <p className="text-xs font-bold text-slate-400 mb-1.5">{t('stats.completed')}</p>
                 </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
                 <p className="text-xs font-black tracking-widest text-slate-400">{t('stats.globalNPS')}</p>
                 <div className="flex items-end gap-2 mt-1">
                    <h4 className={`text-4xl font-black ${npsScore === null ? 'text-slate-300' : npsScore > 50 ? 'text-emerald-500' : npsScore > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {npsScore !== null ? npsScore : '--'}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 mb-1.5">{npsScore !== null ? t('stats.netPoints') : t('stats.noNPS')}</p>
                 </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-6 shadow-sm">
                 <p className="text-xs font-black tracking-widest text-slate-400">{t('stats.avgStaffRating')}</p>
                 <div className="flex items-center gap-2 mt-1">
                    <h4 className="text-4xl font-black text-slate-900 dark:text-white">
                      {initialReviews.length > 0 
                        ? (initialReviews.reduce((acc: number, r: any) => acc + Number(r.rating || 0), 0) / initialReviews.length).toFixed(1)
                        : '--'}
                    </h4>
                    <Star className="w-6 h-6 text-yellow-400 fill-current" />
                 </div>
              </div>
           </div>

           {/* Results Table */}
           <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm overflow-hidden">
              <h3 className="text-xl font-black tracking-tight mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                {t('audit.title')}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-white/5">
                      <th className="pb-4 text-xs font-black tracking-widest text-slate-400 px-2 text-center">{t('audit.table.rating')}</th>
                      <th className="pb-4 text-xs font-black tracking-widest text-slate-400 px-4">{t('audit.table.staffService')}</th>
                      <th className="pb-4 text-xs font-black tracking-widest text-slate-400 px-4">{t('audit.table.comment')}</th>
                      <th className="pb-4 text-xs font-black tracking-widest text-slate-400 px-4">{t('audit.table.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {initialReviews.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center space-y-4">
                           <Info className="w-12 h-12 text-slate-100 dark:text-zinc-800 mx-auto" />
                           <p className="text-sm font-bold text-slate-400 italic">{t('audit.noReviews')}</p>
                        </td>
                      </tr>
                    ) : (
                      initialReviews.map((r: any) => (
                        <tr key={r.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                          <td className="py-5 px-2">
                             <div className="flex flex-col items-center">
                               <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{Number(r.rating).toFixed(1)}</span>
                               <Star className="w-3 h-3 text-yellow-400 fill-current" />
                             </div>
                          </td>
                          <td className="py-5 px-4 max-w-[200px]">
                             <div className="space-y-0.5">
                               <p className="text-sm font-black text-slate-900 dark:text-white truncate">{r.booking?.staff?.name || t('audit.table.staffFallback')}</p>
                               <p className="text-[11px] font-bold text-slate-400 truncate">{r.booking?.service?.name || t('audit.table.serviceFallback')}</p>
                             </div>
                          </td>
                          <td className="py-5 px-4 min-w-[300px]">
                             <div className="space-y-2">
                               {r.comment && (
                                 <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium italic">"{r.comment}"</p>
                               )}
                               <div className="flex flex-wrap gap-2">
                                 {r.responses?.filter((resp: any) => resp.questionType === 'TEXT' && resp.answer).slice(0, 2).map((resp: any, i: number) => (
                                   <div key={i} className="px-2 py-1 bg-purple-500/5 rounded-lg border border-purple-500/10">
                                      <p className="text-[10px] font-black text-slate-400 tracking-tighter">{resp.questionText}</p>
                                      <p className="text-[11px] text-purple-600 font-bold truncate max-w-[150px]">{resp.answer}</p>
                                   </div>
                                 ))}
                               </div>
                             </div>
                          </td>
                          <td className="py-5 px-4">
                             <span className="text-[11px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {/* Modal Pregunta */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             {/* Backdrop con Blur Dinámico - Fixed para cubrir todo */}
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
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
                    <label className="text-xs font-black tracking-widest text-slate-400 ml-1">
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
                      <label className="text-xs font-black tracking-widest text-slate-400 ml-1">
                        {t('questionType')}
                      </label>
                      <select
                        value={editingQuestion?.questionType}
                        onChange={(e) => setEditingQuestion({...editingQuestion, questionType: e.target.value as any})}
                        className="w-full p-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 rounded-[24px] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-sm font-medium dark:text-white appearance-none"
                      >
                        <option value="STARS">{t('types.STARS')}</option>
                        <option value="YES_NO">{t('types.YES_NO')}</option>
                        <option value="TEXT">{t('types.TEXT')}</option>
                        <option value="NPS">{t('types.NPS')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black tracking-widest text-slate-400 ml-1">
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
  );
}
