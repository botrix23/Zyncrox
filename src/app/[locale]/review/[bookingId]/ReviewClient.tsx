"use client";
import { useState } from "react";
import { Star, Loader2, CheckCircle2, ChevronRight, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { createReviewAction } from "@/app/actions/review";
import { useTranslations } from "next-intl";

interface SurveyQuestion {
    id: string;
    questionText: string;
    questionType: 'STARS' | 'YES_NO' | 'TEXT' | 'NPS';
    category: 'STAFF' | 'BUSINESS';
    isRequired: boolean;
}

export default function ReviewClient({ 
    booking, 
    questions = [] 
}: { 
    booking: any;
    questions?: SurveyQuestion[];
}) {
  const t = useTranslations('Review');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no questions are provided, we'll use a virtual "default" star question
  const hasQuestions = questions.length > 0;
  
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (hasQuestions) {
        for (const q of questions) {
            if (q.isRequired && (answers[q.id] === undefined || answers[q.id] === "")) {
                setError(t('requiredError', { question: q.questionText }));
                return;
            }
        }
    } else {
        if (!answers['default_rating']) {
            setError(t('invalidRating'));
            return;
        }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const responses = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id],
        questionText: q.questionText,
        questionType: q.questionType,
        category: q.category
      }));

      const rating = hasQuestions 
        ? 0 // Action will calculate average from responses
        : (answers['default_rating'] || 0);

      if (booking.id === 'test') {
        // Mock success for preview
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSuccess(true);
        return;
      }

      const result = await createReviewAction({
        tenantId: booking.tenantId,
        bookingId: booking.id,
        staffId: booking.staffId,
        rating,
        comment: !hasQuestions ? answers['default_comment'] : "",
        responses: hasQuestions ? responses : []
      });

      if (result.success) {
        setIsSuccess(true);
      } else {
        if (result.error === 'REVIEW_ALREADY_EXISTS') {
          setError(t('alreadyReviewed'));
        } else {
          setError(t('submitError'));
        }
      }
    } catch (err) {
      setError(t('genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-10 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500 border border-slate-200 dark:border-white/5">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t('success')}</h2>
          <p className="text-slate-500 dark:text-zinc-400 font-medium">{t('successSubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 md:p-10 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 border border-slate-200 dark:border-white/5">
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 bg-purple-500/10 rounded-2xl mb-2 text-purple-600 dark:text-purple-400">
           <Star className="w-6 h-6 fill-current" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">{t('title')}</h1>
        <p className="text-slate-500 dark:text-zinc-400 font-medium">
          {t('subtitle', { staff: booking.staff?.name || "nuestro staff" })}
        </p>
      </div>

      <div className="space-y-8">
        {!hasQuestions ? (
          <>
            {/* Default Rating (Backward Compatible / Simple Mode) */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400 block text-center">
                {t('ratingLabel')}
              </label>
              <StarRating 
                value={answers['default_rating'] || 0} 
                onChange={(val) => handleAnswerChange('default_rating', val)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black uppercase tracking-widest text-slate-400 block ml-1">
                {t('commentLabel')}
              </label>
              <textarea
                value={answers['default_comment'] || ""}
                onChange={(e) => handleAnswerChange('default_comment', e.target.value)}
                placeholder={t('commentPlaceholder')}
                rows={4}
                className="w-full p-5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 rounded-[24px] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all resize-none text-sm font-medium dark:text-white"
              />
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {questions.map((q) => (
              <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-500">
                <label className="text-sm font-black text-slate-700 dark:text-white block px-1 leading-snug">
                  {q.questionText} {q.isRequired && <span className="text-rose-500">*</span>}
                </label>
                
                {q.questionType === 'STARS' && (
                  <div className="flex justify-center">
                    <StarRating 
                      value={answers[q.id] || 0} 
                      onChange={(val) => handleAnswerChange(q.id, val)}
                    />
                  </div>
                )}

                {q.questionType === 'YES_NO' && (
                  <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => handleAnswerChange(q.id, true)}
                        className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${answers[q.id] === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}
                     >
                        <ThumbsUp className="w-5 h-5" /> {t('yes')}
                     </button>
                     <button 
                        onClick={() => handleAnswerChange(q.id, false)}
                        className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${answers[q.id] === false ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}
                     >
                        <ThumbsDown className="w-5 h-5" /> {t('no')}
                     </button>
                  </div>
                )}

                {q.questionType === 'TEXT' && (
                   <textarea
                     value={answers[q.id] || ""}
                     onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                     placeholder="Escribe tu respuesta aquí..."
                     rows={3}
                     className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 rounded-[20px] focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all resize-none text-sm font-medium dark:text-white"
                   />
                )}

                {q.questionType === 'NPS' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleAnswerChange(q.id, num)}
                          className={`aspect-square sm:aspect-auto sm:h-12 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                            answers[q.id] === num 
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 scale-110' 
                              : 'bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between px-1 text-xs font-black uppercase tracking-widest text-slate-400">
                      <span>{t('npsLow')}</span>
                      <span>{t('npsHigh')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-shake">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold text-center">
              {error}
            </p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-zinc-600 rounded-[24px] font-black tracking-widest shadow-2xl shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {t('submit')}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (val: number) => void }) {
    const [hoverRating, setHoverRating] = useState(0);
    return (
        <div className="flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => onChange(star)}
                className="group relative transition-all duration-300 transform active:scale-90"
              >
                <Star 
                  className={`w-10 h-10 transition-all duration-300 ${
                    (hoverRating || value) >= star 
                      ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)] fill-current' 
                      : 'text-slate-200 dark:text-zinc-800'
                  }`} 
                />
                {(hoverRating || value) >= star && (
                  <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full scale-150 animate-pulse -z-10" />
                )}
              </button>
            ))}
        </div>
    );
}
